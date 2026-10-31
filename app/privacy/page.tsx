export const metadata = {
  title: "Privacy policy | Northbeam sales assistant"
};

const updated = "31 October 2026";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px", lineHeight: 1.6 }}>
      <h1>Privacy policy</h1>
      <p>Last updated: {updated}</p>

      <p>
        Northbeam sales assistant is a prototype built to demonstrate how a business can respond to sales
        inquiries received on WhatsApp, Instagram and email. It is operated by Rishabh Singh for evaluation
        purposes only and is not offered as a commercial service.
      </p>

      <h2>What we collect</h2>
      <p>
        When you send a message to the connected WhatsApp number, Instagram account or email address, we store
        the content of your message, your sender identifier (phone number, Instagram scoped ID or email
        address), your display name if the platform provides it, and the replies that were sent to you.
      </p>

      <h2>How we use it</h2>
      <p>
        Your messages are used to understand your inquiry, to decide whether it fits the services of a
        fictional analytics consultancy, to assign it to a representative, and to offer and book a meeting
        time. Message text is sent to an AI model provider to read the inquiry and draft replies.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We share data only with the service providers needed to run the prototype: Meta Platforms for
        WhatsApp and Instagram messaging, Google for email and calendar, a hosting provider, a database
        provider, and an AI model provider. We do not sell your data.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Test conversations are kept only while the prototype is under evaluation. To have your messages
        deleted, email the address below with the phone number, Instagram account or email address you used,
        and the data will be removed.
      </p>

      <h2>Contact</h2>
      <p>Rishabh Singh, rishabh73767@gmail.com</p>
    </main>
  );
}
