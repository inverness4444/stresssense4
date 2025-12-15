type Customer = { id: string; orgId: string; email: string; company: string };
type SubscriptionRecord = { id: string; customerId: string; planKey: string; seats: number };
type InvoiceRecord = { id: string; customerId: string; amountDue: number; status: string };

const fakeDb: { customers: Customer[]; subs: SubscriptionRecord[]; invoices: InvoiceRecord[] } = {
  customers: [],
  subs: [],
  invoices: [],
};

export const paymentsProvider = {
  async createCustomer(params: { orgId: string; email: string; company: string }) {
    const id = `cust_${Math.random().toString(36).slice(2, 8)}`;
    fakeDb.customers.push({ id, orgId: params.orgId, email: params.email, company: params.company });
    return { customerId: id };
  },
  async createSubscription(params: { customerId: string; planKey: string; seats: number; trialEndsAt?: Date }) {
    const id = `sub_${Math.random().toString(36).slice(2, 8)}`;
    fakeDb.subs.push({ id, customerId: params.customerId, planKey: params.planKey, seats: params.seats });
    // Create a fake invoice zero amount if trial
    fakeDb.invoices.push({ id: `inv_${Math.random().toString(36).slice(2, 8)}`, customerId: params.customerId, amountDue: 0, status: "paid" });
    return { subscriptionId: id };
  },
  async fetchInvoices(params: { customerId: string }) {
    return fakeDb.invoices.filter((i) => i.customerId === params.customerId);
  },
};
