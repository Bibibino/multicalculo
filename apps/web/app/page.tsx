"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

type Coverage = {
  code: string;
  displayName: string;
  amount: string | null;
  currency: string | null;
  included: boolean;
  details: string | null;
};

type Plan = {
  id: string;
  planName: string;
  currency: string;
  totalPrice: string;
  pricePerTraveler: string | null;
  externalPlanId: string | null;
  externalQuoteReference: string | null;
  collectedAt: string;
  coverages: Coverage[];
};

type Execution = {
  id: string;
  carrierSlug: string;
  carrierName: string;
  status: string;
  attempt: number;
  errorCode: string | null;
  errorMessageSanitized: string | null;
  plansCount: number;
  plans: Plan[];
};

type QuoteRequest = {
  id: string;
  originCountry: string;
  destination: unknown;
  departureDate: string;
  returnDate: string;
  tripPurpose: string;
  status: string;
  travelers: Array<{ id: string; birthDate: string }>;
  executions: Execution[];
  createdAt: string;
};

type User = {
  id: string;
  name: string;
  role: string;
};

const terminalStatuses = new Set(["COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "CANCELLED"]);

const money = (value: string | null, currency = "BRL"): string => {
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency
  }).format(Number(value));
};

const statusLabel = (status: string): string =>
  ({
    QUEUED: "Na fila",
    RUNNING: "Em execucao",
    COMPLETED: "Concluida",
    PARTIALLY_COMPLETED: "Parcial",
    FAILED: "Falhou",
    CANCELLED: "Cancelada",
    SUCCEEDED: "Sucesso",
    FAILED_RETRYABLE: "Falha retry",
    FAILED_FINAL: "Falha final",
    READING_RESULTS: "Lendo resultados",
    STARTING: "Iniciando"
  })[status] ?? status;

export default function Home(): React.ReactElement {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    originCountry: "BR",
    destinationCountries: "PT,ES",
    departureDate: "2026-09-10",
    returnDate: "2026-09-25",
    tripPurpose: "LEISURE",
    travelers: "1995-05-17\n1998-08-03",
    selectedCarrierIds: ["carrier-a", "carrier-b", "carrier-c"]
  });

  const allPlans = useMemo(
    () =>
      selectedQuote?.executions
        .flatMap((execution) =>
          execution.plans.map((plan) => ({
            ...plan,
            carrierName: execution.carrierName,
            carrierSlug: execution.carrierSlug,
            executionStatus: execution.status
          }))
        )
        .sort((left, right) => Number(left.totalPrice) - Number(right.totalPrice)) ?? [],
    [selectedQuote]
  );

  const apiFetch = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  };

  const loadQuotes = async (): Promise<void> => {
    if (!token) {
      return;
    }

    const response = await apiFetch<{ data: QuoteRequest[] }>("/api/v1/quote-requests");
    setQuotes(response.data);
  };

  const loadQuote = async (id: string): Promise<void> => {
    const quote = await apiFetch<QuoteRequest>(`/api/v1/quote-requests/${id}`);
    setSelectedQuote(quote);
    setQuotes((current) => [quote, ...current.filter((candidate) => candidate.id !== quote.id)]);
  };

  useEffect(() => {
    void loadQuotes();
  }, [token]);

  useEffect(() => {
    if (!selectedQuote || terminalStatuses.has(selectedQuote.status)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadQuote(selectedQuote.id);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [selectedQuote?.id, selectedQuote?.status, token]);

  const submitLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const body = (await response.json()) as { accessToken: string; user: User };
      setToken(body.accessToken);
      setUser(body.user);
      setMessage("Login realizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  };

  const submitQuote = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const quote = await apiFetch<QuoteRequest>("/api/v1/quote-requests", {
        method: "POST",
        body: JSON.stringify({
          originCountry: form.originCountry.trim().toUpperCase(),
          destination: {
            type: "COUNTRY",
            countryCodes: form.destinationCountries
              .split(",")
              .map((country) => country.trim().toUpperCase())
              .filter(Boolean)
          },
          departureDate: form.departureDate,
          returnDate: form.returnDate,
          tripPurpose: form.tripPurpose,
          travelers: form.travelers
            .split("\n")
            .map((birthDate) => birthDate.trim())
            .filter(Boolean)
            .map((birthDate) => ({ birthDate })),
          selectedCarrierIds: form.selectedCarrierIds
        })
      });

      setSelectedQuote(quote);
      await loadQuotes();
      setMessage("Cotacao enviada para a fila.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar cotacao.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCarrier = (carrierId: string): void => {
    setForm((current) => ({
      ...current,
      selectedCarrierIds: current.selectedCarrierIds.includes(carrierId)
        ? current.selectedCarrierIds.filter((id) => id !== carrierId)
        : [...current.selectedCarrierIds, carrierId]
    }));
  };

  const cancelQuote = async (): Promise<void> => {
    if (!selectedQuote) {
      return;
    }

    await apiFetch<QuoteRequest>(`/api/v1/quote-requests/${selectedQuote.id}/cancel`, {
      method: "POST"
    });
    await loadQuote(selectedQuote.id);
  };

  const retryCarrier = async (carrierSlug: string): Promise<void> => {
    if (!selectedQuote) {
      return;
    }

    await apiFetch<QuoteRequest>(
      `/api/v1/quote-requests/${selectedQuote.id}/carriers/${carrierSlug}/retry`,
      {
        method: "POST"
      }
    );
    await loadQuote(selectedQuote.id);
  };

  const exportQuote = async (format: "json" | "csv"): Promise<void> => {
    if (!selectedQuote) {
      return;
    }

    const response = await fetch(
      `${apiBaseUrl}/api/v1/quote-requests/${selectedQuote.id}/export?format=${format}`,
      {
        headers: {
          authorization: `Bearer ${token}`
        }
      }
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cotacao-${selectedQuote.id}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Seguro viagem</p>
          <h1>Multicalculo MVP</h1>
        </div>

        <form className="loginBox" onSubmit={(event) => void submitLogin(event)}>
          <label>
            E-mail
            <input name="email" type="email" defaultValue="operador@corretora.test" />
          </label>
          <label>
            Senha
            <input name="password" type="password" defaultValue="dev-password" />
          </label>
          <button type="submit" disabled={loading}>
            Entrar
          </button>
          {user ? <p className="session">Sessao: {user.name}</p> : null}
        </form>

        <section className="quoteList">
          <div className="sectionHeader">
            <h2>Cotacoes</h2>
            <button type="button" onClick={() => void loadQuotes()} disabled={!token}>
              Atualizar
            </button>
          </div>
          {quotes.map((quote) => (
            <button
              className="quoteListItem"
              key={quote.id}
              type="button"
              onClick={() => void loadQuote(quote.id)}
            >
              <span>{statusLabel(quote.status)}</span>
              <strong>{quote.id.slice(0, 8)}</strong>
              <small>{quote.departureDate} a {quote.returnDate}</small>
            </button>
          ))}
        </section>
      </aside>

      <section className="workspace">
        {message ? <div className="message">{message}</div> : null}

        <form className="quoteForm" onSubmit={(event) => void submitQuote(event)}>
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Nova cotacao</p>
              <h2>Dados da viagem</h2>
            </div>
            <button type="submit" disabled={!token || loading || form.selectedCarrierIds.length === 0}>
              Criar cotacao
            </button>
          </div>

          <div className="formGrid">
            <label>
              Origem
              <input
                value={form.originCountry}
                onChange={(event) => setForm({ ...form, originCountry: event.target.value })}
              />
            </label>
            <label>
              Destinos
              <input
                value={form.destinationCountries}
                onChange={(event) =>
                  setForm({ ...form, destinationCountries: event.target.value })
                }
              />
            </label>
            <label>
              Ida
              <input
                type="date"
                value={form.departureDate}
                onChange={(event) => setForm({ ...form, departureDate: event.target.value })}
              />
            </label>
            <label>
              Volta
              <input
                type="date"
                value={form.returnDate}
                onChange={(event) => setForm({ ...form, returnDate: event.target.value })}
              />
            </label>
            <label>
              Finalidade
              <select
                value={form.tripPurpose}
                onChange={(event) => setForm({ ...form, tripPurpose: event.target.value })}
              >
                <option value="LEISURE">Lazer</option>
                <option value="BUSINESS">Negocios</option>
                <option value="STUDY">Estudo</option>
                <option value="SPORTS">Esportes</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>
            <label>
              Passageiros
              <textarea
                value={form.travelers}
                onChange={(event) => setForm({ ...form, travelers: event.target.value })}
                rows={4}
              />
            </label>
          </div>

          <fieldset className="carrierSelector">
            <legend>Seguradoras</legend>
            {["carrier-a", "carrier-b", "carrier-c"].map((carrierId) => (
              <label key={carrierId}>
                <input
                  type="checkbox"
                  checked={form.selectedCarrierIds.includes(carrierId)}
                  onChange={() => toggleCarrier(carrierId)}
                />
                {carrierId}
              </label>
            ))}
          </fieldset>
        </form>

        {selectedQuote ? (
          <section className="detail">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Detalhe</p>
                <h2>{statusLabel(selectedQuote.status)}</h2>
                <p className="muted">
                  {selectedQuote.id} · {selectedQuote.departureDate} a {selectedQuote.returnDate}
                </p>
              </div>
              <div className="actions">
                <button type="button" onClick={() => void loadQuote(selectedQuote.id)}>
                  Atualizar
                </button>
                <button type="button" onClick={() => void exportQuote("json")}>
                  JSON
                </button>
                <button type="button" onClick={() => void exportQuote("csv")}>
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => void cancelQuote()}
                  disabled={terminalStatuses.has(selectedQuote.status)}
                >
                  Cancelar
                </button>
              </div>
            </div>

            <div className="executionGrid">
              {selectedQuote.executions.map((execution) => (
                <article className="executionItem" key={execution.id}>
                  <div>
                    <strong>{execution.carrierName}</strong>
                    <span>{statusLabel(execution.status)}</span>
                  </div>
                  <p>{execution.plansCount} plano(s) · tentativa {execution.attempt}</p>
                  {execution.errorMessageSanitized ? (
                    <p className="errorText">{execution.errorMessageSanitized}</p>
                  ) : null}
                  {["FAILED_RETRYABLE", "FAILED_FINAL", "CANCELLED"].includes(execution.status) ? (
                    <button type="button" onClick={() => void retryCarrier(execution.carrierSlug)}>
                      Retry
                    </button>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="comparison">
              <h2>Comparador</h2>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Seguradora</th>
                      <th>Plano</th>
                      <th>Preco total</th>
                      <th>Por pessoa</th>
                      <th>Medica</th>
                      <th>Bagagem</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPlans.map((plan) => {
                      const medical = plan.coverages.find(
                        (coverage) => coverage.code === "MEDICAL_HOSPITAL"
                      );
                      const baggage = plan.coverages.find(
                        (coverage) => coverage.code === "BAGGAGE_LOSS"
                      );

                      return (
                        <tr key={plan.id}>
                          <td>{plan.carrierName}</td>
                          <td>{plan.planName}</td>
                          <td>{money(plan.totalPrice, plan.currency)}</td>
                          <td>{money(plan.pricePerTraveler, plan.currency)}</td>
                          <td>{medical?.amount ? money(medical.amount, medical.currency ?? "USD") : "-"}</td>
                          <td>{baggage?.amount ? money(baggage.amount, baggage.currency ?? "BRL") : "-"}</td>
                          <td>{statusLabel(plan.executionStatus)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (
          <section className="emptyState">
            <h2>Nenhuma cotacao selecionada</h2>
            <p>Crie ou selecione uma cotacao para acompanhar as execucoes mock.</p>
          </section>
        )}
      </section>
    </main>
  );
}
