import React, { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import api from "../../lib/api";
import { Plus } from "lucide-react";
import { PageHeader, PrimaryButton, Modal, Field, Input, Textarea, Select } from "../../components/shared/UI";
import { toast } from "sonner";

const DealCard = ({ deal, dragging }) => {
  return (
    <div
      className={`bg-white border border-stone-200 p-3 mb-2 cursor-grab active:cursor-grabbing ${dragging ? "shadow-lg" : "hover:border-stone-400"}`}
      data-testid={`deal-card-${deal.id}`}
    >
      <div className="text-sm font-medium text-stone-950 mb-1 truncate">{deal.title}</div>
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-xs text-brand-blue font-bold">${deal.value.toLocaleString()}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
          {new Date(deal.created_at).toLocaleDateString()}
        </span>
      </div>
      {deal.description && <div className="text-xs text-stone-500 mt-2 line-clamp-2">{deal.description}</div>}
    </div>
  );
};

const DraggableDeal = ({ deal }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <DealCard deal={deal} />
    </div>
  );
};

const Column = ({ stage, deals }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.name });
  const total = deals.reduce((s, d) => s + d.value, 0);
  return (
    <div className={`flex-shrink-0 w-72 bg-stone-50 border border-stone-200 flex flex-col ${isOver ? "border-brand-blue" : ""}`} data-testid={`pipeline-stage-${stage.name.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="px-4 py-3 border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-stone-950">{stage.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mt-0.5">
              {deals.length} deals · ${total.toLocaleString()}
            </div>
          </div>
          <div className="w-1.5 h-1.5 bg-brand-blue"></div>
        </div>
      </div>
      <div ref={setNodeRef} className="flex-1 p-3 min-h-[300px]">
        {deals.map((d) => <DraggableDeal key={d.id} deal={d} />)}
      </div>
    </div>
  );
};

export default function PipelinePage() {
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", stage: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    try {
      const [stagesRes, dealsRes] = await Promise.all([
        api.get("/crm/stages"),
        api.get("/crm/deals"),
      ]);
      setStages(stagesRes.data);
      setDeals(dealsRes.data);
      if (stagesRes.data.length > 0 && !form.stage) {
        setForm((f) => ({ ...f, stage: stagesRes.data[0].name }));
      }
    } catch (e) {}
  };

  useEffect(() => { load(); }, []);

  const dragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const deal = deals.find((d) => d.id === active.id);
    const newStage = over.id;
    if (deal && deal.stage !== newStage) {
      const prev = [...deals];
      setDeals(deals.map((d) => (d.id === active.id ? { ...d, stage: newStage } : d)));
      try {
        await api.patch(`/crm/deals/${active.id}`, { stage: newStage });
        toast.success(`Moved to ${newStage}`);
      } catch (e) {
        setDeals(prev);
        if (e.response?.status !== 429) toast.error("Failed to move deal");
      }
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, value: parseFloat(form.value) };
      await api.post("/crm/deals", payload);
      toast.success("Deal created");
      setOpen(false);
      setForm({ title: "", value: "", stage: stages[0]?.name || "", description: "" });
      load();
    } catch (e) {
      if (e.response?.status !== 429) toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  return (
    <div data-testid="pipeline-page">
      <PageHeader
        title="Sales Pipeline"
        subtitle="CRM / 003"
        action={
          <PrimaryButton onClick={() => setOpen(true)} testId="new-deal-button">
            <Plus className="w-3.5 h-3.5" /> New Deal
          </PrimaryButton>
        }
      />

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={dragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" data-testid="pipeline-board">
          {stages.map((s) => (
            <Column key={s.name} stage={s} deals={deals.filter((d) => d.stage === s.name)} />
          ))}
        </div>
        <DragOverlay>{activeDeal ? <DealCard deal={activeDeal} dragging /> : null}</DragOverlay>
      </DndContext>

      <Modal open={open} onClose={() => setOpen(false)} title="New Deal" testId="deal-modal">
        <form onSubmit={submit}>
          <Field label="Title"><Input value={form.title} onChange={set("title")} required data-testid="deal-title-input" /></Field>
          <Field label="Value (USD)"><Input type="number" step="0.01" value={form.value} onChange={set("value")} required data-testid="deal-value-input" /></Field>
          <Field label="Stage">
            <Select value={form.stage} onChange={set("stage")} required data-testid="deal-stage-select">
              {stages.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Description"><Textarea value={form.description} onChange={set("description")} data-testid="deal-description-input" /></Field>
          <button type="submit" disabled={submitting} data-testid="deal-submit-button" className="w-full px-4 py-2.5 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950 disabled:opacity-50">
            {submitting ? "Creating..." : "Create Deal"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
