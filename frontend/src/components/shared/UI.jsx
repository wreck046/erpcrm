import React from "react";

export const DataTable = ({ columns, rows, emptyLabel = "No records", testId }) => {
  return (
    <div className="bg-white border border-stone-200 overflow-x-auto" data-testid={testId}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-stone-500 font-medium"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-stone-400 text-sm">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id || i} className="border-b border-stone-200 hover:bg-stone-50" data-testid={`${testId}-row-${i}`}>
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-stone-800 ${col.mono ? "font-mono text-xs" : ""}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-end justify-between mb-6">
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-1">{subtitle}</div>
      <h2 className="font-heading font-black text-2xl tracking-tight text-stone-950">{title}</h2>
    </div>
    {action}
  </div>
);

export const PrimaryButton = ({ children, onClick, testId, type = "button" }) => (
  <button
    type={type}
    onClick={onClick}
    data-testid={testId}
    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium hover:bg-stone-950"
  >
    {children}
  </button>
);

export const Modal = ({ open, onClose, title, children, testId }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/30" onClick={onClose} data-testid={testId}>
      <div
        className="bg-white border border-stone-300 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Form</div>
            <h3 className="font-heading font-black text-lg tracking-tight text-stone-950">{title}</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-950 text-xl leading-none" data-testid="modal-close">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const Field = ({ label, children }) => (
  <div className="mb-4">
    <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500 mb-2">{label}</label>
    {children}
  </div>
);

export const Input = (props) => (
  <input
    {...props}
    className="w-full px-3 py-2 bg-white border border-stone-200 text-sm text-stone-950 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
  />
);

export const Textarea = (props) => (
  <textarea
    {...props}
    className="w-full px-3 py-2 bg-white border border-stone-200 text-sm text-stone-950 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue min-h-[80px]"
  />
);

export const Select = (props) => (
  <select
    {...props}
    className="w-full px-3 py-2 bg-white border border-stone-200 text-sm text-stone-950 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
  />
);

export const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-stone-100 text-stone-700 border-stone-200",
    blue: "bg-brand-blue text-white border-brand-blue",
    red: "bg-brand-red text-white border-brand-red",
    success: "bg-stone-950 text-white border-stone-950",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border ${variants[variant]}`}>
      {children}
    </span>
  );
};
