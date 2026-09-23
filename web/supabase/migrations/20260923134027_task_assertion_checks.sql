-- Opt-in version 2 checks; version 1 task snapshots keep their original meaning.
alter table public.projects drop constraint projects_task_definition_valid;
alter table public.projects add constraint projects_task_definition_valid check (
  task_definition is null or coalesce((
    jsonb_typeof(task_definition) = 'object'
    and jsonb_typeof(task_definition->'goal') = 'string'
    and char_length(btrim(task_definition->>'goal')) between 10 and 1000
    and jsonb_typeof(task_definition->'successText') = 'string'
    and char_length(btrim(task_definition->>'successText')) between 3 and 240
    and (
      (task_definition->'version' = '1'::jsonb
        and task_definition - array['version', 'goal', 'successText'] = '{}'::jsonb)
      or
      (task_definition->'version' = '2'::jsonb
        and jsonb_typeof(task_definition->'requireNewText') = 'boolean'
        and (not (task_definition ? 'expectedUrl') or (
          jsonb_typeof(task_definition->'expectedUrl') = 'string'
          and char_length(task_definition->>'expectedUrl') between 1 and 2048
          and task_definition->>'expectedUrl' ~ '^https?://[^/?#@[:space:]]+([/?#].*)?$'
        ))
        and (task_definition ? 'expectedUrl' or task_definition->'requireNewText' = 'true'::jsonb)
        and task_definition - array['version', 'goal', 'successText', 'expectedUrl', 'requireNewText'] = '{}'::jsonb)
    )
  ), false)
);
