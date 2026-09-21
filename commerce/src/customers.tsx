import { useEffect, useState } from "react";
import { db } from "./api";
import { useI18n } from "./i18n";
import { ErrorMessage, Field } from "./ui";
import { Pagination } from "./products";

// Order roles only, enforced by customer RLS. Addresses stay in order details.
export function Customers() {
  const { t } = useI18n();
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState("");
  const [rows, setRows] = useState<{ id: string; name: string }[]>([]);
  const [contact, setContact] = useState<{ id: string; email: string } | null>(
    null,
  );
  useEffect(() => {
    let live = true;
    const query = db()
      .from("v25_customers")
      .select("id,name")
      .order("id")
      .range(page * 50, page * 50 + 49);
    if (search.trim())
      query.ilike("name", `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`);
    void query.then(({ data, error }) => {
      if (live) {
        setError(error?.message ?? "");
        setRows(data ?? []);
      }
    });
    return () => {
      live = false;
    };
  }, [search, page]);
  return (
    <>
      <Field label="Search customer name">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
            setContact(null);
          }}
        />
      </Field>
      <p>
        {t(
          "Customer contact details are shown only on request. Delivery addresses remain in the relevant order.",
        )}
      </p>
      <ErrorMessage error={error} />
      <div
        className="table-wrap"
        role="region"
        aria-label={t("Customers")}
        tabIndex={0}
      >
        <table>
          <caption>{t("Customers")}</caption>
          <thead>
            <tr>
              <th>{t("Name")}</th>
              <th>{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>
                  <button
                    onClick={async () => {
                      if (contact?.id === row.id) {
                        setContact(null);
                        return;
                      }
                      const { data, error } = await db()
                        .from("v25_customers")
                        .select("id,email")
                        .eq("id", row.id)
                        .single();
                      setError(error?.message ?? "");
                      setContact(data);
                    }}
                  >
                    {t(
                      contact?.id === row.id ? "Hide contact" : "View contact",
                    )}{" "}
                    · {row.name}
                  </button>
                  {contact?.id === row.id && <p>{contact.email}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>{t("No matching customers.")}</p>}
      <Pagination page={page} next={rows.length === 50} change={setPage} />
    </>
  );
}
