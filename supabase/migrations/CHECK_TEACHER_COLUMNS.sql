-- Ver columnas de teacher_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teacher_profiles' 
ORDER BY ordinal_position;
