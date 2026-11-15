-- LCC Palaro schema. Run in the Supabase SQL Editor on a new project.
-- Security model: public reads are limited to published/public records; all writes require an admin profile.
create extension if not exists pgcrypto;
create type public.admin_role as enum ('spectator','admin','super_admin');
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','super_admin') and p.is_active=true); $$;
create or replace function public.is_super_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin' and p.is_active=true); $$;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 display_name text,
 role public.admin_role not null default 'spectator',
 is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.event_settings (
 id uuid primary key default gen_random_uuid(), event_title text not null default 'LCC Palaro', academic_year text default '2026', tagline text,
 event_dates_label text, starts_on date, ends_on date, primary_color text default '#efba42', logo_url text, hero_image_url text, favicon_url text,
 contact_email text, contact_details text, is_public boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sports (
 id uuid primary key default gen_random_uuid(), name text not null unique, slug text unique, category text not null check(category in ('team_sport','individual_sport','board_game','esport')),
 description text, image_url text, competition_format text not null default 'single_elimination' check(competition_format in ('single_elimination','double_elimination','round_robin','group_knockout')),
 scoring_method text, rules jsonb not null default '{}'::jsonb, match_duration_minutes integer check(match_duration_minutes is null or match_duration_minutes>0),
 ranking_rules jsonb not null default '{"win_points":3,"draw_points":1,"loss_points":0}'::jsonb, status text not null default 'draft' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.teams (
 id uuid primary key default gen_random_uuid(), name text not null unique, abbreviation text not null unique, primary_color text default '#efba42', logo_url text, banner_url text,
 course text, delegation text, coach_name text, coach_email text, representative_name text, registration_status text not null default 'draft' check(registration_status in ('draft','registered','approved','withdrawn')),
 status text not null default 'registered' check(status in ('draft','registered','approved','withdrawn')), public_description text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.players (
 id uuid primary key default gen_random_uuid(), first_name text not null, last_name text not null, preferred_name text, photo_url text, jersey_number integer check(jersey_number is null or jersey_number>=0),
 position text, course text, public_profile boolean not null default false, eligibility_status text not null default 'pending' check(eligibility_status in ('pending','eligible','ineligible')),
 notes_private text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.team_rosters (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade, player_id uuid not null references public.players(id) on delete cascade,
 sport_id uuid not null references public.sports(id) on delete cascade, jersey_number integer, position text, roster_status text not null default 'active' check(roster_status in ('active','reserve','removed')),
 created_at timestamptz not null default now(), unique(team_id,player_id,sport_id)
);
create table public.player_sport_registrations (
 id uuid primary key default gen_random_uuid(), player_id uuid not null references public.players(id) on delete cascade, sport_id uuid not null references public.sports(id) on delete cascade,
 team_id uuid references public.teams(id) on delete set null, status text not null default 'pending' check(status in ('pending','approved','rejected')), created_at timestamptz not null default now(), unique(player_id,sport_id)
);
create table public.venues (
 id uuid primary key default gen_random_uuid(), name text not null unique, location text, capacity integer check(capacity is null or capacity>=0), notes text,
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tournament_stages (
 id uuid primary key default gen_random_uuid(), sport_id uuid not null references public.sports(id) on delete cascade, name text not null, stage_order integer not null default 1,
 format text not null check(format in ('single_elimination','double_elimination','round_robin','group_knockout')), status text not null default 'draft' check(status in ('draft','published','completed')),
 settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(sport_id,stage_order)
);
create table public.matches (
 id uuid primary key default gen_random_uuid(), sport_id uuid not null references public.sports(id) on delete restrict, stage_id uuid references public.tournament_stages(id) on delete set null,
 home_team_id uuid references public.teams(id) on delete restrict, away_team_id uuid references public.teams(id) on delete restrict, venue_id uuid references public.venues(id) on delete set null,
 scheduled_at timestamptz, duration_minutes integer, break_minutes integer, round_name text, round_number integer, bracket_position integer, group_name text,
 status text not null default 'scheduled' check(status in ('scheduled','in_progress','paused','completed','postponed','cancelled')),
 home_score integer check(home_score is null or home_score>=0), away_score integer check(away_score is null or away_score>=0), winner_team_id uuid references public.teams(id) on delete set null,
 is_published boolean not null default false, started_at timestamptz, completed_at timestamptz, notes text, version integer not null default 1,
 next_match_id uuid references public.matches(id) on delete set null, next_match_slot text check(next_match_slot is null or next_match_slot in ('home','away')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(home_team_id is null or away_team_id is null or home_team_id<>away_team_id)
);
create table public.match_lineups (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade, team_id uuid not null references public.teams(id) on delete cascade,
 player_id uuid not null references public.players(id) on delete cascade, lineup_role text not null default 'starter' check(lineup_role in ('starter','substitute','reserve')),
 position text, jersey_number integer, submitted_at timestamptz, is_published boolean not null default false, created_at timestamptz not null default now(), unique(match_id,player_id)
);
create table public.match_periods (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade, period_number integer not null,
 label text not null, home_score integer not null default 0 check(home_score>=0), away_score integer not null default 0 check(away_score>=0), status text not null default 'pending', created_at timestamptz not null default now(), unique(match_id,period_number)
);
create table public.score_events (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade, period_label text not null default 'Match', event_type text not null default 'score',
 team_id uuid references public.teams(id) on delete set null, player_id uuid references public.players(id) on delete set null, score_delta integer not null default 0,
 home_score_after integer, away_score_after integer, note text, is_void boolean not null default false, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table public.player_match_stats (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade, player_id uuid not null references public.players(id) on delete cascade,
 team_id uuid references public.teams(id) on delete set null, stats jsonb not null default '{}'::jsonb, points numeric not null default 0, rebounds numeric not null default 0,
 assists numeric not null default 0, steals numeric not null default 0, blocks numeric not null default 0, kills numeric not null default 0, aces numeric not null default 0,
 digs numeric not null default 0, is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(match_id,player_id)
);
create table public.best_player_selections (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade, player_id uuid not null references public.players(id) on delete restrict,
 selection_method text not null default 'manual' check(selection_method in ('manual','statistics')), reason text, calculated_score numeric, weights jsonb, status text not null default 'draft' check(status in ('draft','published')),
 selected_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(match_id)
);
create table public.standings (
 id uuid primary key default gen_random_uuid(), sport_id uuid not null references public.sports(id) on delete cascade, stage_id uuid references public.tournament_stages(id) on delete cascade,
 team_id uuid not null references public.teams(id) on delete cascade, played integer not null default 0, wins integer not null default 0, draws integer not null default 0, losses integer not null default 0,
 points integer not null default 0, scored integer not null default 0, conceded integer not null default 0, difference integer not null default 0, sets_won integer not null default 0, sets_lost integer not null default 0,
 rank integer, updated_at timestamptz not null default now(), unique(sport_id,stage_id,team_id)
);
create table public.announcements (
 id uuid primary key default gen_random_uuid(), title text not null, body text not null, image_url text, attachment_path text, status text not null default 'draft' check(status in ('draft','published','archived')),
 published_at timestamptz, scheduled_publish_at timestamptz, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null, actor_email text, action text not null, entity_type text not null, entity_id uuid,
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.bracket_entries (
 id uuid primary key default gen_random_uuid(), stage_id uuid not null references public.tournament_stages(id) on delete cascade, team_id uuid not null references public.teams(id) on delete cascade,
 seed integer, group_name text, created_at timestamptz not null default now(), unique(stage_id,team_id), unique(stage_id,seed)
);

create index matches_schedule_idx on public.matches(scheduled_at); create index matches_status_idx on public.matches(status); create index matches_sport_idx on public.matches(sport_id);
create index team_rosters_team_idx on public.team_rosters(team_id,sport_id); create index score_events_match_idx on public.score_events(match_id,created_at);
create index announcements_public_idx on public.announcements(status,published_at desc); create index audit_logs_created_idx on public.audit_logs(created_at desc); create index stats_match_idx on public.player_match_stats(match_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','event_settings','sports','teams','players','venues','tournament_stages','matches','player_match_stats','best_player_selections','announcements'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t); end loop; end $$;

-- Admin-only score event RPC: updates score and writes an immutable event record atomically.
create or replace function public.record_score_event(p_match_id uuid,p_period text default 'Match',p_event_type text default 'score',p_team_id uuid default null,p_delta integer default 1,p_note text default null)
returns public.matches language plpgsql security definer set search_path=public as $$
declare m public.matches; nh integer; na integer;
begin
 if not public.is_admin() then raise exception 'Administrator permission required'; end if;
 select * into m from public.matches where id=p_match_id for update;
 if not found then raise exception 'Match not found'; end if;
 if m.status not in ('in_progress','paused') then raise exception 'Match must be in progress or paused to update score'; end if;
 nh:=coalesce(m.home_score,0); na:=coalesce(m.away_score,0);
 if p_team_id=m.home_team_id then nh:=nh+p_delta; elsif p_team_id=m.away_team_id then na:=na+p_delta; elsif p_team_id is not null then raise exception 'Team is not part of this match'; end if;
 if nh<0 or na<0 then raise exception 'Scores cannot be negative'; end if;
 update public.matches set home_score=nh,away_score=na,version=version+1 where id=p_match_id returning * into m;
 insert into public.score_events(match_id,period_label,event_type,team_id,score_delta,home_score_after,away_score_after,note,created_by) values(p_match_id,coalesce(p_period,'Match'),coalesce(p_event_type,'score'),p_team_id,p_delta,nh,na,p_note,auth.uid());
 insert into public.audit_logs(actor_id,actor_email,action,entity_type,entity_id,details) values(auth.uid(),auth.jwt()->>'email','score_updated','matches',p_match_id,jsonb_build_object('home_score',nh,'away_score',na,'delta',p_delta,'team_id',p_team_id));
 return m;
end $$;

-- Finalization and winner advancement occur within one transaction. Downstream conflicts stop the operation.
create or replace function public.finalize_match(p_match_id uuid,p_winner_team_id uuid default null)
returns public.matches language plpgsql security definer set search_path=public as $$
declare m public.matches; winner uuid; downstream public.matches;
begin
 if not public.is_admin() then raise exception 'Administrator permission required'; end if;
 select * into m from public.matches where id=p_match_id for update;
 if not found then raise exception 'Match not found'; end if;
 if m.home_score is null or m.away_score is null then raise exception 'Both scores must be entered before finalizing'; end if;
 if m.home_score=m.away_score and p_winner_team_id is null then raise exception 'A tied score requires an explicit winner or sport-specific draw handling'; end if;
 winner:=coalesce(p_winner_team_id,case when m.home_score>m.away_score then m.home_team_id else m.away_team_id end);
 if winner is distinct from m.home_team_id and winner is distinct from m.away_team_id then raise exception 'Winner must be one of the teams in this match'; end if;
 if m.next_match_id is not null then
   select * into downstream from public.matches where id=m.next_match_id for update;
   if not found then raise exception 'Configured next match does not exist'; end if;
   if downstream.status='completed' and ((m.next_match_slot='home' and downstream.home_team_id is distinct from winner) or (m.next_match_slot='away' and downstream.away_team_id is distinct from winner)) then raise exception 'A downstream match is already finalized; correct or regenerate the bracket first'; end if;
   if m.next_match_slot='home' and downstream.away_team_id=winner then raise exception 'Winner already occupies the other slot in the next match'; end if;
   if m.next_match_slot='away' and downstream.home_team_id=winner then raise exception 'Winner already occupies the other slot in the next match'; end if;
 end if;
 update public.matches set status='completed',winner_team_id=winner,completed_at=now(),is_published=true,version=version+1 where id=p_match_id returning * into m;
 if m.next_match_id is not null then
   if m.next_match_slot='home' then update public.matches set home_team_id=winner,version=version+1 where id=m.next_match_id and status<>'completed';
   elsif m.next_match_slot='away' then update public.matches set away_team_id=winner,version=version+1 where id=m.next_match_id and status<>'completed'; end if;
 end if;
 insert into public.audit_logs(actor_id,actor_email,action,entity_type,entity_id,details) values(auth.uid(),auth.jwt()->>'email','match_finalized','matches',p_match_id,jsonb_build_object('winner_team_id',winner,'home_score',m.home_score,'away_score',m.away_score));
 return m;
end $$;

-- Create a single-elimination first-round fixture set; later rounds should be linked to next_match_id/slot by the admin UI or an audited bracket workflow.
create or replace function public.generate_bracket(p_sport_id uuid,p_stage_id uuid,p_team_ids uuid[],p_format text default 'single_elimination') returns integer language plpgsql security definer set search_path=public as $$
declare i integer; n integer; created_count integer:=0; a uuid; b uuid;
begin
 if not public.is_admin() then raise exception 'Administrator permission required'; end if;
 if p_format not in ('single_elimination','double_elimination','round_robin','group_knockout') then raise exception 'Unsupported format'; end if;
 if coalesce(array_length(p_team_ids,1),0)<2 then raise exception 'At least two teams are required'; end if;
 if exists(select 1 from public.matches where stage_id=p_stage_id and status in ('in_progress','completed')) then raise exception 'Cannot regenerate a stage after matches have started or completed'; end if;
 delete from public.matches where stage_id=p_stage_id and status in ('scheduled','cancelled');
 n:=array_length(p_team_ids,1);
 if p_format='round_robin' then
   for i in 1..n loop for j in (i+1)..n loop
     insert into public.matches(sport_id,stage_id,home_team_id,away_team_id,round_name,status) values(p_sport_id,p_stage_id,p_team_ids[i],p_team_ids[j],'Round robin','scheduled'); created_count:=created_count+1;
   end loop; end loop;
 else
   i:=1; while i<n loop
     a:=p_team_ids[i]; b:=p_team_ids[i+1];
     insert into public.matches(sport_id,stage_id,home_team_id,away_team_id,round_name,status) values(p_sport_id,p_stage_id,a,b,'Round 1','scheduled'); created_count:=created_count+1; i:=i+2;
   end loop;
   if n%2=1 then insert into public.matches(sport_id,stage_id,home_team_id,round_name,status) values(p_sport_id,p_stage_id,p_team_ids[n],'Round 1 · Bye','completed'); created_count:=created_count+1; end if;
 end if;
 insert into public.audit_logs(actor_id,actor_email,action,entity_type,entity_id,details) values(auth.uid(),auth.jwt()->>'email','bracket_generated','tournament_stages',p_stage_id,jsonb_build_object('format',p_format,'team_count',n,'matches_created',created_count));
 return created_count;
end $$;

-- Row-level security: explicitly enabled on every table.
do $$ declare t text; begin foreach t in array array['profiles','event_settings','sports','teams','players','team_rosters','player_sport_registrations','venues','tournament_stages','matches','match_lineups','match_periods','score_events','player_match_stats','best_player_selections','standings','announcements','audit_logs','bracket_entries'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy profiles_read_self_or_admin on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy profiles_admin_update on public.profiles for update using (public.is_super_admin()) with check (public.is_super_admin());
create policy settings_public_read on public.event_settings for select using (is_public=true or public.is_admin()); create policy settings_admin_write on public.event_settings for all using(public.is_admin()) with check(public.is_admin());
create policy sports_public_read on public.sports for select using(status='published' or public.is_admin()); create policy sports_admin_write on public.sports for all using(public.is_admin()) with check(public.is_admin());
create policy teams_public_read on public.teams for select using(status='approved' or registration_status='approved' or public.is_admin()); create policy teams_admin_write on public.teams for all using(public.is_admin()) with check(public.is_admin());
create policy players_public_read on public.players for select using(public_profile=true or public.is_admin()); create policy players_admin_write on public.players for all using(public.is_admin()) with check(public.is_admin());
create policy roster_public_read on public.team_rosters for select using(exists(select 1 from public.players p where p.id=player_id and p.public_profile=true) or public.is_admin()); create policy roster_admin_write on public.team_rosters for all using(public.is_admin()) with check(public.is_admin());
create policy registrations_admin_only on public.player_sport_registrations for all using(public.is_admin()) with check(public.is_admin());
create policy venues_public_read on public.venues for select using(is_active=true or public.is_admin()); create policy venues_admin_write on public.venues for all using(public.is_admin()) with check(public.is_admin());
create policy stages_public_read on public.tournament_stages for select using(status='published' or public.is_admin()); create policy stages_admin_write on public.tournament_stages for all using(public.is_admin()) with check(public.is_admin());
create policy matches_public_read on public.matches for select using((is_published=true and status<>'cancelled') or public.is_admin()); create policy matches_admin_write on public.matches for all using(public.is_admin()) with check(public.is_admin());
create policy lineups_public_read on public.match_lineups for select using(is_published=true or public.is_admin()); create policy lineups_admin_write on public.match_lineups for all using(public.is_admin()) with check(public.is_admin());
create policy periods_public_read on public.match_periods for select using(exists(select 1 from public.matches m where m.id=match_id and m.is_published=true) or public.is_admin()); create policy periods_admin_write on public.match_periods for all using(public.is_admin()) with check(public.is_admin());
create policy score_events_public_read on public.score_events for select using(exists(select 1 from public.matches m where m.id=match_id and m.is_published=true) or public.is_admin()); create policy score_events_admin_write on public.score_events for all using(public.is_admin()) with check(public.is_admin());
create policy stats_public_read on public.player_match_stats for select using(is_published=true or public.is_admin()); create policy stats_admin_write on public.player_match_stats for all using(public.is_admin()) with check(public.is_admin());
create policy best_player_public_read on public.best_player_selections for select using(status='published' or public.is_admin()); create policy best_player_admin_write on public.best_player_selections for all using(public.is_admin()) with check(public.is_admin());
create policy standings_public_read on public.standings for select using(exists(select 1 from public.sports s where s.id=sport_id and s.status='published') or public.is_admin()); create policy standings_admin_write on public.standings for all using(public.is_admin()) with check(public.is_admin());
create policy announcements_public_read on public.announcements for select using(status='published' and (published_at is null or published_at<=now()) or public.is_admin()); create policy announcements_admin_write on public.announcements for all using(public.is_admin()) with check(public.is_admin());
create policy audit_admin_read on public.audit_logs for select using(public.is_admin()); create policy audit_admin_insert on public.audit_logs for insert with check(public.is_admin());
create policy bracket_entries_public_read on public.bracket_entries for select using(exists(select 1 from public.tournament_stages s where s.id=stage_id and s.status='published') or public.is_admin()); create policy bracket_entries_admin_write on public.bracket_entries for all using(public.is_admin()) with check(public.is_admin());

revoke all on function public.record_score_event(uuid,text,text,uuid,integer,text) from public,anon; grant execute on function public.record_score_event(uuid,text,text,uuid,integer,text) to authenticated;
revoke all on function public.finalize_match(uuid,uuid) from public,anon; grant execute on function public.finalize_match(uuid,uuid) to authenticated;
revoke all on function public.generate_bracket(uuid,uuid,uuid[],text) from public,anon; grant execute on function public.generate_bracket(uuid,uuid,uuid[],text) to authenticated;

-- Enable Realtime for public match score and score-event updates.
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.score_events;
alter publication supabase_realtime add table public.standings;
-- Create the private/public-media bucket in Supabase Storage separately, then apply policies below.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('palaro-media','palaro-media',true,5242880,array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']) on conflict(id) do nothing;
create policy palaro_media_public_read on storage.objects for select using(bucket_id='palaro-media');
create policy palaro_media_admin_upload on storage.objects for insert to authenticated with check(bucket_id='palaro-media' and public.is_admin());
create policy palaro_media_admin_update on storage.objects for update to authenticated using(bucket_id='palaro-media' and public.is_admin()) with check(bucket_id='palaro-media' and public.is_admin());
create policy palaro_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='palaro-media' and public.is_admin());
