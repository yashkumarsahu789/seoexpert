-- Remove manual AI Task Runner box (automations use keys internally only)

DELETE FROM public.temp_automation_boxes WHERE slug = 'ai-loop-demo';
