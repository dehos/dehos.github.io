import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowUpRight, Boxes, ChartNoAxesCombined, ChevronDown, CircleCheck, Database, Layers3, Package, ShoppingCart } from "lucide-react";

const roadmap = [
  "Audit repo dan catat kondisi awal",
  "Fondasi React + Vite, Tailwind v4, Radix, Lucide, Supabase client",
  "Migrasi Dashboard",
  "Migrasi Penjualan",
  "Migrasi Stock dan In Out",
  "Uji regresi, build, dan deployment",
];

export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-5 md:block">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="rounded-xl bg-slate-900 p-2 text-white"><Boxes size={22} /></div>
          <div><p className="font-semibold tracking-tight">DEHOS</p><p className="text-xs text-slate-500">React migration</p></div>
        </div>
        <nav className="mt-8 space-y-1 text-sm">
          <a className="flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2.5 font-medium" href="#dashboard"><ChartNoAxesCombined size={17} /> Dashboard</a>
          <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-500" href="#roadmap"><ShoppingCart size={17} /> Penjualan</a>
          <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-500" href="#roadmap"><Package size={17} /> Stock</a>
          <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-500" href="#roadmap"><Layers3 size={17} /> In Out</a>
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-slate-200 p-3 text-xs text-slate-500">
          <div className="mb-1 flex items-center gap-2 font-medium text-slate-700"><Database size={15} /> Database produksi</div>
          Belum dihubungkan pada scaffold ini.
        </div>
      </aside>

      <section id="dashboard" className="md:ml-64">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-9">
          <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Workspace / DEHOS</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Fondasi migrasi</h1></div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">Tahap 1 <ChevronDown size={15} /></DropdownMenu.Trigger>
            <DropdownMenu.Portal><DropdownMenu.Content align="end" className="z-10 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"><DropdownMenu.Item className="cursor-default rounded-md px-3 py-2 text-sm outline-none">Fondasi UI</DropdownMenu.Item><DropdownMenu.Item className="cursor-default rounded-md px-3 py-2 text-sm outline-none">Belum terhubung ke produksi</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal>
          </DropdownMenu.Root>
        </header>

        <div className="mx-auto max-w-6xl space-y-6 p-5 md:p-9">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-sm font-medium text-slate-500">Migration workspace</p><h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">Fondasi baru, aplikasi lama tetap aman.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Ini scaffold terpisah untuk menyiapkan stack modern. Belum menggantikan website live atau mengubah database Supabase.</p></div>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800"><span className="size-1.5 rounded-full bg-amber-500" /> Belum produksi</span>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[["React + Vite","UI dan build"],["Tailwind CSS v4","Styling"],["Radix UI","Primitives"],["Lucide React","Ikon"]].map(([title,desc]) => <div key={title} className="rounded-xl border border-slate-200 p-4"><CircleCheck className="text-emerald-600" size={18}/><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-500">{desc}</p></div>)}
            </div>
            <Dialog.Root>
              <Dialog.Trigger className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">Lihat batas migrasi <ArrowUpRight size={16}/></Dialog.Trigger>
              <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-20 bg-slate-950/30"/><Dialog.Content className="fixed left-1/2 top-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl"><Dialog.Title className="text-lg font-semibold">Batas tahap ini</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">Tidak mengubah index.html, script.js, style.css, workflow produksi, atau skema/database Supabase yang lama. Migrasi fitur dimulai hanya setelah fondasi siap dan diverifikasi.</Dialog.Description><Dialog.Close className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Mengerti</Dialog.Close></Dialog.Content></Dialog.Portal>
            </Dialog.Root>
          </div>

          <section id="roadmap" className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold tracking-tight">Roadmap migrasi</h2><p className="mt-1 text-sm text-slate-500">Tahapan dicatat agar pekerjaan tidak diulang.</p></div><span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">Tahap 2 / 6</span></div>
            <ol className="mt-5 space-y-3">{roadmap.map((item, index) => <li key={item} className="flex items-start gap-3"><span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${index < 2 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{index < 2 ? <CircleCheck size={14}/> : index + 1}</span><span className={`text-sm ${index < 2 ? "text-slate-700" : "text-slate-500"}`}>{item}</span><span className="ml-auto text-xs text-slate-400">{index < 2 ? "Fondasi" : "Berikutnya"}</span></li>)}</ol>
          </section>
        </div>
      </section>
    </main>
  );
}