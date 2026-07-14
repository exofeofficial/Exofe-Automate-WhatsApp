import LegalLayout from "@/components/legal/LegalLayout";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="July 13, 2026"
      intro="This policy explains what information Exofe collects, why we collect it, and how we protect it. Exofe is a WhatsApp order automation platform for businesses in Pakistan, South Korea, and the UAE."
    >
      <section>
        <h2>1. Information we collect</h2>
        <p>When you sign up for Exofe, we collect the information you give us directly, such as your name, business name, email address, phone number, and password.</p>
        <p>Once your WhatsApp Business account is connected, we process the messages, orders, and customer details that flow through your Exofe account so the AI assistant and dashboard can work. This includes:</p>
        <ul>
          <li>Customer names, phone numbers, and message content sent to your WhatsApp number</li>
          <li>Products, prices, and orders you create in Exofe</li>
          <li>Billing information needed to process your subscription</li>
          <li>Basic usage data, like which pages you visit and how you use the dashboard, so we can improve the product</li>
        </ul>
      </section>

      <section>
        <h2>2. How we use your information</h2>
        <p>We use the information above to:</p>
        <ul>
          <li>Operate your account and connect your WhatsApp Business number through Meta</li>
          <li>Let the AI assistant read and respond to customer messages on your behalf</li>
          <li>Create and track orders, and show you reports on your dashboard</li>
          <li>Send you account related emails, like billing receipts or a trial ending soon</li>
          <li>Investigate and prevent misuse of the platform</li>
        </ul>
      </section>

      <section>
        <h2>3. WhatsApp and Meta</h2>
        <p>Exofe connects to your WhatsApp Business number through Meta&apos;s WhatsApp Business Platform. When a customer messages your number, that message passes through Meta&apos;s systems before reaching Exofe. Meta has its own privacy policy governing that part of the process, separate from this one.</p>
        <p>Exofe only sends and receives messages on your behalf. We do not use your customer conversations for anything outside of running your Exofe account, and we do not sell conversation data to third parties.</p>
      </section>

      <section>
        <h2>4. Who we share information with</h2>
        <p>We do not sell your data. We share information only with the services that are required to run Exofe, such as:</p>
        <ul>
          <li>Meta, to send and receive WhatsApp messages</li>
          <li>Our hosting and database providers, to store your account and business data securely</li>
          <li>Payment processors, to handle your subscription billing</li>
        </ul>
        <p>We may also share information if required by law, or to protect the rights and safety of Exofe, our users, or the public.</p>
      </section>

      <section>
        <h2>5. Data storage and security</h2>
        <p>Your data is stored on servers with restricted access, and sensitive values like access tokens are encrypted. We use industry standard practices to protect your account, but no system can guarantee complete security, and we encourage you to use a strong password and keep it private.</p>
      </section>

      <section>
        <h2>6. How long we keep your data</h2>
        <p>We keep your account and business data for as long as your account is active. If you close your account, we delete your data within a reasonable period, except where we are required to keep certain records, such as billing history, for legal or tax reasons.</p>
      </section>

      <section>
        <h2>7. Your rights</h2>
        <p>You can access, update, or request deletion of your data at any time. See our <a href="/data-deletion">Data Deletion</a> page for how to submit a request. If you are a customer messaging a business that uses Exofe and want your conversation data removed, you can contact that business directly, or reach out to us and we will help.</p>
      </section>

      <section>
        <h2>8. Cookies</h2>
        <p>Our website uses a small number of cookies to keep you logged in and to understand how the site is used. You can control cookies through your browser settings, though some parts of Exofe may not work correctly if cookies are disabled.</p>
      </section>

      <section>
        <h2>9. Children&apos;s privacy</h2>
        <p>Exofe is built for businesses, not individual consumers, and is not intended for use by children. We do not knowingly collect information from children under 18.</p>
      </section>

      <section>
        <h2>10. Changes to this policy</h2>
        <p>We may update this policy as Exofe grows. If we make a significant change, we will let you know by email or through a notice on the dashboard.</p>
      </section>

      <section>
        <h2>11. Contact us</h2>
        <p>If you have questions about this policy or how your data is handled, email us at <a href="mailto:privacy@exofe.com">privacy@exofe.com</a>.</p>
      </section>
    </LegalLayout>
  );
}
