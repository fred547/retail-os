"use client";

import { useState } from "react";
import { Mail, Phone, Users } from "lucide-react";
import CustomerEditModal, { Customer } from "./CustomerEditModal";

export default function CustomerTable({
  customers,
  search,
}: {
  customers: Customer[];
  search: string;
}) {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const formatAddress = (c: Customer): string => {
    return [c.address1, c.address2, c.city, c.state, c.zip, c.country]
      .filter(Boolean)
      .join(", ");
  };

  if (customers.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="mx-auto text-gray-400" size={64} />
        <h3 className="text-lg font-medium text-gray-700 mt-4">
          {search ? "No customers match your search" : "No customers yet"}
        </h3>
        <p className="text-gray-500 mt-1">
          {search
            ? "Try a different search term"
            : "Customers will appear here once added from the POS app"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Points</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.customer_id}
                onClick={() => setEditingCustomer(c)}
                className="cursor-pointer hover:bg-blue-50/50 transition"
                role="button"
                tabIndex={0}
                aria-label={`Edit customer ${c.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setEditingCustomer(c);
                  }
                }}
              >
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-posterita-blue/10 rounded-full flex items-center justify-center">
                      <span className="text-posterita-blue font-semibold text-sm">
                        {c.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </div>
                </td>
                <td>
                  {c.email ? (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Mail size={14} />
                      <span className="text-sm">{c.email}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">&mdash;</span>
                  )}
                </td>
                <td>
                  {c.phone1 ? (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Phone size={14} />
                      <span className="text-sm">{c.phone1}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">&mdash;</span>
                  )}
                </td>
                <td className="text-gray-500 text-sm max-w-xs truncate">
                  {formatAddress(c) || <span className="text-gray-400">&mdash;</span>}
                </td>
                <td>
                  {c.loyaltypoints > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      {c.loyaltypoints.toLocaleString()} pts
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">0</span>
                  )}
                </td>
                <td>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.isactive === "Y"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.isactive === "Y" ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingCustomer && (
        <CustomerEditModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      )}
    </>
  );
}
