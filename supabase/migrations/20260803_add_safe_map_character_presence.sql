create or replace function public.get_map_characters()
returns table (
  id text,
  user_id text,
  player_name text,
  character_name text,
  character_photo_url text,
  map_icon_url text,
  portrait_url text,
  icon_url text,
  profile_sheet jsonb,
  current_location jsonb,
  updated_at text
)
language sql
stable
security definer
set search_path = ''
as $function$
  with character_source as (
    select to_jsonb(character_row) as row_data
    from public.characters as character_row
  )
  select
    row_data ->> 'id' as id,

    case
      when row_data ->> 'user_id' = auth.uid()::text
        then row_data ->> 'user_id'
      else null
    end as user_id,

    row_data ->> 'player_name' as player_name,
    row_data ->> 'character_name' as character_name,
    row_data ->> 'character_photo_url' as character_photo_url,
    row_data ->> 'map_icon_url' as map_icon_url,
    row_data ->> 'portrait_url' as portrait_url,
    row_data ->> 'icon_url' as icon_url,

    case
      when row_data ->> 'user_id' = auth.uid()::text then
        coalesce(
          nullif(row_data -> 'profile_sheet', 'null'::jsonb),
          '{}'::jsonb
        )
      else
        jsonb_build_object(
          'currentLocation',
          coalesce(
            nullif(row_data -> 'current_location', 'null'::jsonb),
            nullif(row_data -> 'profile_sheet' -> 'currentLocation', 'null'::jsonb),
            nullif(row_data -> 'profile_sheet' -> 'mapLocation', 'null'::jsonb)
          )
        )
    end as profile_sheet,

    coalesce(
      nullif(row_data -> 'current_location', 'null'::jsonb),
      nullif(row_data -> 'profile_sheet' -> 'currentLocation', 'null'::jsonb),
      nullif(row_data -> 'profile_sheet' -> 'mapLocation', 'null'::jsonb)
    ) as current_location,

    row_data ->> 'updated_at' as updated_at
  from character_source
  where auth.uid() is not null;
$function$;

revoke all on function public.get_map_characters() from public;
revoke all on function public.get_map_characters() from anon;
grant execute on function public.get_map_characters() to authenticated;

notify pgrst, 'reload schema';
