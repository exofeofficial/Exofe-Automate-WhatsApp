import LegalLayout from "@/components/legal/LegalLayout";

export default function DataDeletionPage() {
  return (
    <LegalLayout
      title="Data Deletion"
      lastUpdated="July 13, 2026"
      intro="You can ask us to delete your data at any time. This page explains what that means and how to request it, for both business owners using Exofe and their customers messaging on WhatsApp."
    >
      <section>
        <h2>1. If you are a business using Exofe</h2>
        <p>You can request full deletion of your Exofe account and data by emailing us from the address linked to your account. Once we confirm the request, we delete:</p>
        <ul>
          <li>Your account details and login information</li>
          <li>Your product catalog, orders, and customer records</li>
          <li>Your WhatsApp connection, including any stored access tokens</li>
          <li>Your conversation history stored in Exofe</li>
        </ul>
        <p>We complete deletion requests within 30 days. We may keep billing records for a longer period where we are required to for tax or accounting purposes, but this data is not used for anything else.</p>
      </section>

      <section>
        <h2>2. If you are a customer messaging a business on WhatsApp</h2>
        <p>If a business you messaged uses Exofe, your conversation is stored in that business&apos;s Exofe account so the AI assistant can respond to you and process your order. To have this data deleted, you can:</p>
        <ul>
          <li>Message the business directly and ask them to delete your conversation, since it is their account, or</li>
          <li>Email us at the address below with the business name and the WhatsApp number the conversation happened on, and we will forward the request and confirm once it is completed</li>
        </ul>
      </section>

      <section>
        <h2>3. Deleting your data through Facebook or Meta</h2>
        <p>If you connected Exofe to your WhatsApp Business Account through Meta and want to remove that connection specifically, you can also do this from your Meta Business Settings by removing Exofe&apos;s access, in addition to contacting us directly.</p>
      </section>

      <section>
        <h2>4. How to submit a request</h2>
        <p>Email <a href="mailto:support@exofe.com">support@exofe.com</a> with the subject line &quot;Data Deletion Request&quot;, along with your business name and the email address on your Exofe account. We will confirm your identity before processing the request, to make sure we are not deleting someone else&apos;s data by mistake.</p>
      </section>
    </LegalLayout>
  );
}
