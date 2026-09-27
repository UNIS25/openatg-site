"use client";
import { Check } from "lucide-react";
import { usePlatform } from "./platform";
import { money } from "@/lib/domain";
import { polishText, type PolishKey } from "@/lib/polish";

export function MembershipComparison({
  onSelect,
  busy = false,
}: {
  onSelect?: (id: string) => Promise<void>;
  busy?: boolean;
}) {
  const { locale, tr, plans, delivery, threshold, state, polish, ready } =
    usePlatform();
  const current = state?.rows.memberships?.[0];
  const Heading = onSelect ? "h1" : "h2";
  const active = current?.status === "active";
  const values = {
    delivery: money(delivery, locale),
    threshold: money(threshold, locale),
    discount: String(
      (plans.find((p) => p.id === "gold-monthly")?.discount_bps || 0) / 100,
    ),
  };
  const text = (key: PolishKey) => polishText(polish, locale, key, values);
  const currentLabel = {
    de: "Ihre aktuelle Mitgliedschaft",
    fr: "Votre adhésion actuelle",
    en: "Your current membership",
  }[locale];
  return (
    <section
      className="membership-comparison container"
      aria-label={tr("membership")}
    >
      <div className="comparison-heading">
        <p className="eyebrow">VARATHANS25 · {tr("membership")}</p>
        <Heading>Silver &amp; Gold</Heading>
        <p className="staging-terms">{text("terms")}</p>
      </div>
      <div className="comparison-panels">
        {(["silver", "gold"] as const).map((tier) => {
          const plan = plans.find(
            (p) => p.id === (tier === "silver" ? "silver" : "gold-monthly"),
          );
          const yearly = plans.find((p) => p.id === "gold-yearly");
          const selected =
            active &&
            (tier === "silver"
              ? current.plan_id === "silver"
              : current.plan_id.startsWith("gold-"));
          const keys: PolishKey[] =
            tier === "silver"
              ? [
                  "silverRecurring",
                  "silverDelivery",
                  "silverThreshold",
                  "silverProfile",
                  "silverPreferences",
                ]
              : [
                  "goldDelivery",
                  "goldDiscount",
                  "goldDrink",
                  "goldPass",
                  "goldBenefits",
                ];
          return (
            <article
              key={tier}
              className={`comparison-panel ${tier}`}
              data-current={!!selected}
            >
              <header>
                <p className="eyebrow">{tier.toUpperCase()}</p>
                <h3>{tier === "gold" ? "Gold" : "Silver"}</h3>
                <p>
                  {text(tier === "gold" ? "goldPosition" : "silverPosition")}
                </p>
              </header>
              <div className="comparison-price">
                <p>
                  {plan ? money(plan.fee_rappen, locale) : "—"}
                  {tier === "gold" && <span>{tr("month")}</span>}
                </p>
                {tier === "gold" && (
                  <p>
                    {yearly ? money(yearly.fee_rappen, locale) : "—"}
                    <span>{tr("year")}</span>
                  </p>
                )}
              </div>
              <ul>
                {keys.map((key) => (
                  <li key={key}>
                    <Check size={16} aria-hidden="true" />
                    <span>{text(key)}</span>
                  </li>
                ))}
              </ul>
              <div className="comparison-action">
                <p className="current-tier">
                  {selected ? currentLabel : "\u00a0"}
                </p>
                {onSelect ? (
                  <div className="comparison-select">
                    <button
                      className="button"
                      disabled={busy || !ready || !plan}
                      onClick={() =>
                        void onSelect(
                          tier === "gold" ? "gold-monthly" : "silver",
                        )
                      }
                    >
                      {tier === "gold"
                        ? tr("chooseMonthly")
                        : text("silverCta")}
                    </button>
                    {tier === "gold" && (
                      <button
                        className="button"
                        disabled={busy || !ready || !yearly}
                        onClick={() => void onSelect("gold-yearly")}
                      >
                        {tr("chooseYearly")}
                      </button>
                    )}
                  </div>
                ) : (
                  <a
                    className="button"
                    aria-current={selected ? "true" : undefined}
                    href={
                      selected ? `/${locale}/account` : `/${locale}/membership`
                    }
                  >
                    {selected
                      ? tr("account")
                      : text(tier === "gold" ? "goldCta" : "silverCta")}
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
