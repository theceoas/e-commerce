SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
AND routine_schema = 'public' 
AND routine_name = 'get_dashboard_stats';
