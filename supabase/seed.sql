-- Intentionally no fake competition data is inserted. Optional event settings starter:
insert into public.event_settings(event_title,academic_year,tagline,event_dates_label,is_public)
values ('LCC Palaro','2026','The spirit of competition. The pride of LCC.','Dates to be announced',true)
on conflict do nothing;
