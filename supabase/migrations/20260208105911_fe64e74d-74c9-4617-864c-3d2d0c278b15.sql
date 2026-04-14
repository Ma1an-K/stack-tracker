CREATE OR REPLACE FUNCTION public.join_with_invite_code(code_input text)
 RETURNS TABLE(homegame_id uuid, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    RETURN QUERY SELECT NULL::UUID AS homegame_id, 'Invalid or inactive invite code'::TEXT AS error_message;
    RETURN;
  END IF;
  
  -- Atomic validation checks for expiration
  IF invite_record.expires_at IS NOT NULL 
     AND invite_record.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID AS homegame_id, 'This invite code has expired'::TEXT AS error_message;
    RETURN;
  END IF;
  
  -- Atomic validation checks for max uses
  IF invite_record.max_uses IS NOT NULL 
     AND invite_record.uses_count >= invite_record.max_uses THEN
    RETURN QUERY SELECT NULL::UUID AS homegame_id, 'This invite code has reached its maximum uses'::TEXT AS error_message;
    RETURN;
  END IF;
  
  -- Check existing membership
  IF EXISTS (
    SELECT 1 FROM homegame_members 
    WHERE homegame_members.homegame_id = invite_record.homegame_id 
      AND homegame_members.user_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT NULL::UUID AS homegame_id, 'You are already a member of this homegame'::TEXT AS error_message;
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
  
  -- Success - return the homegame_id with explicit column aliases
  RETURN QUERY SELECT invite_record.homegame_id AS homegame_id, NULL::TEXT AS error_message;
END;
$function$