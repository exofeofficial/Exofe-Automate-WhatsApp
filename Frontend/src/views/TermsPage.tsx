import LegalLayout from "@/components/legal/LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      lastUpdated="July 13, 2026"
      intro="These terms cover your use of Exofe. By creating an account, you agree to them. Please read them before you sign up."
    >
      <section>
        <h2>1. Who these terms apply to</h2>
        <p>Exofe is available to businesses in Pakistan, South Korea, and the UAE. By using Exofe, you confirm you are authorized to act on behalf of the business you sign up with, and that the information you provide is accurate.</p>
      </section>

      <section>
        <h2>2. What Exofe does</h2>
        <p>Exofe connects to your WhatsApp Business number and uses an AI assistant to reply to customer messages, take orders, and help you manage products, customers, and conversations from one dashboard.</p>
      </section>

      <section>
        <h2>3. Your account</h2>
        <p>You are responsible for keeping your login details secure and for all activity that happens under your account. Let us know right away if you think your account has been accessed without permission.</p>
      </section>

      <section>
        <h2>4. Free trial and billing</h2>
        <p>New accounts get a 7 day free trial. After the trial ends, you need to choose a paid plan to keep using Exofe, orders and conversations pause until you do. Subscription fees are billed in advance and are not refundable except where required by law.</p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>You agree not to use Exofe to:</p>
        <ul>
          <li>Send spam, unsolicited marketing, or messages that break Meta&apos;s WhatsApp Business Messaging Policy</li>
          <li>Sell or promote illegal products or services</li>
          <li>Attempt to interfere with or disrupt Exofe&apos;s systems</li>
          <li>Impersonate another business or mislead customers</li>
        </ul>
        <p>We can suspend or close an account that violates these terms, especially where it puts our relationship with Meta or other users at risk.</p>
      </section>

      <section>
        <h2>6. Your content and data</h2>
        <p>You keep ownership of your business data, product catalog, and customer conversations. You give Exofe permission to store and process that data only to provide the service to you, as described in our <a href="/privacy">Privacy Policy</a>.</p>
      </section>

      <section>
        <h2>7. AI generated responses</h2>
        <p>Exofe&apos;s AI assistant replies to customers based on the information and instructions you provide. While we work to keep it accurate, the AI can make mistakes. You are responsible for reviewing your AI settings, product details, and policies to make sure customers receive correct information.</p>
      </section>

      <section>
        <h2>8. Third party services</h2>
        <p>Exofe depends on third party services, including Meta&apos;s WhatsApp Business Platform and payment processors. We are not responsible for outages, restrictions, or changes made by these third parties that affect your use of Exofe.</p>
      </section>

      <section>
        <h2>9. Termination</h2>
        <p>You can cancel your subscription at any time from Billing. We may suspend or terminate an account for violating these terms, non-payment, or misuse of the platform. If your account is terminated, your WhatsApp connection is disconnected and the AI assistant stops responding.</p>
      </section>

      <section>
        <h2>10. Limitation of liability</h2>
        <p>Exofe is provided as is. To the extent allowed by law, we are not liable for indirect damages, lost profits, or lost data resulting from your use of the platform. Our total liability to you is limited to the amount you paid us in the 3 months before the issue occurred.</p>
      </section>

      <section>
        <h2>11. Changes to these terms</h2>
        <p>We may update these terms from time to time. If we make a significant change, we will notify you by email or through the dashboard before it takes effect.</p>
      </section>

      <section>
        <h2>12. Contact us</h2>
        <p>Questions about these terms can be sent to <a href="mailto:legal@exofe.com">legal@exofe.com</a>.</p>
      </section>
    </LegalLayout>
  );
}
