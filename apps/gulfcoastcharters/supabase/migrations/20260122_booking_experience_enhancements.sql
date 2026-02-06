-- Additional Enhancements for Booking Experience
-- Run after main migrations to add constraints and validations

-- ============================================
-- TIP DISTRIBUTION VALIDATION
-- ============================================

-- Function to validate tip distributions sum to 100%
create or replace function validate_tip_distribution_percentage()
returns trigger as $$
declare
  total_percentage decimal(5,2);
begin
  select coalesce(sum(percentage), 0) into total_percentage
  from public.tip_distributions
  where tip_id = new.tip_id;
  
  if total_percentage > 100 then
    raise exception 'Tip distributions cannot exceed 100%% (current: %%)', total_percentage;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Trigger to validate on insert/update
drop trigger if exists trigger_validate_tip_distribution_percentage on public.tip_distributions;
create trigger trigger_validate_tip_distribution_percentage
  after insert or update on public.tip_distributions
  for each row
  execute function validate_tip_distribution_percentage();

-- ============================================
-- CALENDAR AVAILABILITY ENHANCEMENTS
-- ============================================

-- Function to automatically release expired holds
create or replace function release_expired_holds()
returns void as $$
begin
  -- Update availability status from 'hold' to 'available' for expired holds
  update public.calendar_availability
  set status = 'available'
  where status = 'hold'
    and availability_id in (
      select availability_id
      from public.booking_holds
      where expires_at < now()
    );
  
  -- Delete expired holds
  delete from public.booking_holds
  where expires_at < now();
end;
$$ language plpgsql;

-- ============================================
-- WAITLIST POSITION MANAGEMENT
-- ============================================

-- Function to recalculate waitlist positions when someone is removed
create or replace function recalculate_waitlist_positions()
returns trigger as $$
begin
  -- Only recalculate if status changed to cancelled or booked
  if old.status = 'waiting' and new.status in ('cancelled', 'booked', 'expired') then
    -- Recalculate positions for remaining waitlist entries
    update public.waitlist
    set position = subq.new_position
    from (
      select 
        waitlist_id,
        row_number() over (
          partition by captain_id, desired_date 
          order by added_at
        ) as new_position
      from public.waitlist
      where captain_id = new.captain_id
        and desired_date = new.desired_date
        and status = 'waiting'
    ) as subq
    where waitlist.waitlist_id = subq.waitlist_id
      and waitlist.captain_id = new.captain_id
      and waitlist.desired_date = new.desired_date
      and waitlist.status = 'waiting';
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Trigger to recalculate positions
drop trigger if exists trigger_recalculate_waitlist_positions on public.waitlist;
create trigger trigger_recalculate_waitlist_positions
  after update on public.waitlist
  for each row
  execute function recalculate_waitlist_positions();

-- ============================================
-- RAIN CHECK EXPIRATION CHECK
-- ============================================

-- Function to automatically expire rain checks
create or replace function expire_rain_checks()
returns void as $$
begin
  update public.rain_checks
  set status = 'expired'
  where status = 'active'
    and expiration_date < now();
end;
$$ language plpgsql;

-- ============================================
-- GIFT CERTIFICATE EXPIRATION CHECK
-- ============================================

-- Function to automatically expire gift certificates
create or replace function expire_gift_certificates()
returns void as $$
begin
  update public.gift_certificates
  set status = 'expired'
  where status = 'active'
    and expires_at is not null
    and expires_at < now();
end;
$$ language plpgsql;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Additional indexes for common queries
create index if not exists idx_tips_status on public.tips(status);
create index if not exists idx_tip_distributions_tip on public.tip_distributions(tip_id);
create index if not exists idx_rain_checks_status_expiration on public.rain_checks(status, expiration_date);
create index if not exists idx_gift_certificates_status_expiration on public.gift_certificates(status, expires_at);
create index if not exists idx_review_requests_status_expires on public.review_requests(status, expires_at);
create index if not exists idx_waitlist_status_date on public.waitlist(status, desired_date);
