
-- Update session_players: Jo -> Joseph
UPDATE session_players 
SET player_id = 'c05094b3-af5b-4c12-89fd-b572547dfc74'
WHERE player_id = '2af5dbff-969e-4d45-b5ed-59e17c90213c';

-- Update session_players: Vainer -> Nathan
UPDATE session_players 
SET player_id = 'd72916bc-294c-429f-8de4-bdb7e6b90b56'
WHERE player_id = '873f8c08-8b2f-436f-a994-f1bd84cb9953';

-- Delete the incorrect player records
DELETE FROM players WHERE id = '2af5dbff-969e-4d45-b5ed-59e17c90213c';
DELETE FROM players WHERE id = '873f8c08-8b2f-436f-a994-f1bd84cb9953';
