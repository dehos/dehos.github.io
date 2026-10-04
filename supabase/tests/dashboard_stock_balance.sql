-- Read-only regression fixtures: adjustments, PO fulfillment, and date bounds.
with products(id, initial, start_date, expected) as (
 values (1,1000::numeric,date '2026-10-01',0::numeric),
        (2,10,date '2026-10-01',14),
        (3,0,date '2026-10-01',0),
        (4,100,date '2026-10-05',0),
        (5,10,date '2026-10-01',10)
), movements(product_id,kind,qty,on_date) as (
 values (1,'adjust_keluar',1000::numeric,date '2026-10-01'),
        (1,'laku',1000,date '2026-10-02'),
        (1,'masuk',1000,date '2026-10-03'),
        (2,'adjust_masuk',7,date '2026-10-02'),
        (2,'adjust_keluar',3,date '2026-10-03'),
        (3,'laku',20,date '2026-10-02'),
        (3,'masuk',5,date '2026-10-03'),
        (5,'masuk',100,date '2026-10-05')
), balances as (
 select p.id,p.expected,
  case when p.start_date <= date '2026-10-04' then p.initial else 0 end
  +coalesce(sum(case when m.kind in ('masuk','adjust_masuk') then m.qty
    when m.kind in ('laku','adjust_keluar') then -m.qty else 0 end),0) as raw_stock
 from products p left join movements m on m.product_id=p.id and m.on_date<=date '2026-10-04'
 group by p.id,p.expected,p.start_date,p.initial
)
select bool_and(greatest(raw_stock,0)=expected) as all_cases_pass,
 sum(greatest(raw_stock,0)) as available_stock,
 sum(greatest(-raw_stock,0)) as pending_po
from balances;