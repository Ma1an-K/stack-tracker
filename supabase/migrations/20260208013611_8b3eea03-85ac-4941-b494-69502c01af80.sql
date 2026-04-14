-- Create atomic function for joining homegame with invite code
-- This eliminates the race condition by using SELECT FOR UPDATE and atomic operations
CREATE OR REPLACE FUNCTION public.join_with_invite_code(code_input TEXT) 
RETURNS TABLE(homegame_id UUID, error_message TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  invite_record invite_codes;
  new_member_id UUID;
BEGIN
  -- Lock and validate atomically with SELECT FOR UPDATE
  SELECT * INTO invite_record 
  FROM invite_codes 
  WHERE code = UPPER(TRIM(code_input)) 
    AND is_active = true 
  FOR UPDATE;  -- Prevents concurrent access
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 'Invalid or inactive invite code'::TEXT;
    RETURN;
  END IF;
  
  -- Atomic validation checks for expiration
  IF invite_record.expires_at IS NOT NULL 
     AND invite_record.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, 'This invite code has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Atomic validation checks for max uses
  IF invite_record.max_uses IS NOT NULL 
     AND invite_record.uses_count >= invite_record.max_uses THEN
    RETURN QUERY SELECT NULL::UUID, 'This invite code has reached its maximum uses'::TEXT;
    RETURN;
  END IF;
  
  -- Check existing membership
  IF EXISTS (
    SELECT 1 FROM homegame_members 
    WHERE homegame_id = invite_record.homegame_id 
      AND user_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT NULL::UUID, 'You are already a member of this homegame'::TEXT;
    RETURN;
  END IF;
  
  -- Insert member
  INSERT INTO homegame_members(homegame_id, user_id, role)
  VALUES (invite_record.homegame_id, auth.uid(), 'member')
  RETURNING id INTO new_member_id;
  
  -- Increment counter atomically (uses database-level increment)
  UPDATE invite_codes 
  SET uses_count = uses_count + 1
  WHERE id = invite_record.id;
  
  -- Success - return the homegame_id
  RETURN QUERY SELECT invite_record.homegame_id, NULL::TEXT;
END;
$$;