// Text pages under More (CUS-26). Copy from the customer prototype.
export type Block = { h?: string; p?: string; list?: string[] };
export type Page = { id: string; title: string; blocks: Block[] };

export const PAGES: Page[] = [
  {
    id: "terms",
    title: "Terms and conditions",
    blocks: [
      {
        p: "These terms cover ordering from Casual Kitchen Express (CKE) in the app. By placing an order you agree to them.",
      },
      {
        h: "Orders and payment",
        p: "Prices are shown in the app before you pay. The app currently uses demo payments, and no money is taken.",
      },
      {
        h: "Delivery",
        p: "We deliver from Uselu to Oluku Market for a flat delivery fee shown at checkout. Online orders and delivery run from 8:00 am to 6:00 pm. Pickup is available for any address.",
      },
      {
        h: "Cancelling",
        p: "You can cancel before the kitchen acknowledges your order, for a full refund. After that you can request a cancellation, and a manager decides. Once your food is ready, it can’t be cancelled. Cancelling often can limit cancelling on your account.",
      },
      {
        h: "Your account",
        p: "Keep your phone and Google account secure. You can deactivate or delete your account from Profile at any time.",
      },
      {
        h: "Changes",
        p: "We may update these terms. The date at the bottom shows the latest version.",
      },
      { p: "Last updated November 2026." },
    ],
  },
  {
    id: "privacy",
    title: "Privacy policy",
    blocks: [
      { p: "What we collect, why, and how to remove it." },
      {
        h: "What we collect",
        list: [
          "Your name and email, from Google, so we know whose order it is.",
          "Your delivery address, pin, landmark, and phone number, so the rider can find you.",
          "Your gender, only if you give it.",
          "A profile photo, only if you add one. It’s compressed on your phone first.",
          "Your orders, so you can track and reorder them.",
        ],
      },
      { h: "Payments", p: "Payments are demo only. No real card or bank details are collected." },
      {
        h: "Location",
        p: "We don’t track customers. Riders share their location only while carrying an order.",
      },
      {
        h: "Removing your data",
        p: "Deactivate your account to take a break, or delete it to remove your details for good. Both are in Profile.",
      },
    ],
  },
  {
    id: "about",
    title: "About us",
    blocks: [
      {
        p: "Casual Kitchen Express cooks home-style Nigerian meals in Ugbowo, close to the University of Benin, and gets them to you fast.",
      },
      {
        h: "What we serve",
        p: "Jollof and fried rice, a rotating soup of the day with eba or pounded yam, proteins and sides, snacks, and cold drinks.",
      },
      {
        h: "When",
        p: "Online orders and delivery from 8:00 am to 6:00 pm. Walk in until 8:30 pm.",
      },
      { h: "Where we deliver", p: "From Uselu to Oluku Market." },
    ],
  },
  {
    id: "support",
    title: "Support us",
    blocks: [
      { p: "We’re a small kitchen. These things help us most:" },
      {
        h: "Tell a friend",
        p: "Share the app with classmates and colleagues who want real food, fast.",
      },
      {
        h: "Rate your orders",
        p: "A quick star rating after each delivery tells us what to keep and what to fix.",
      },
      { h: "Follow us", p: "Find us on Instagram and TikTok for new dishes and daily specials." },
      {
        h: "Tell us what to improve",
        p: "Message us on WhatsApp with ideas or problems. We read everything.",
      },
    ],
  },
  {
    id: "partner",
    title: "Partner with us",
    blocks: [
      { p: "We work with people and businesses around Ugbowo, Uselu, and Oluku." },
      {
        h: "Offices and hostels",
        p: "Regular lunch for a team or a hostel block, delivered at a set time.",
      },
      {
        h: "Campus events",
        p: "Food for society meetings, departmental events, and celebrations.",
      },
      {
        h: "Suppliers",
        p: "Local farmers and suppliers of rice, peppers, proteins, and packaging.",
      },
      { h: "Get in touch", p: "Message us on WhatsApp or email ammycan6@gmail.com." },
    ],
  },
  {
    id: "faq",
    title: "FAQs",
    blocks: [
      {
        h: "Where do you deliver?",
        p: "From Uselu to Oluku Market. Beyond Oluku Market you can order for pickup.",
      },
      {
        h: "How much is delivery?",
        p: "A flat fee shown at checkout, whatever you order. Pickup is free.",
      },
      {
        h: "When can I order online?",
        p: "From 8:00 am to 6:00 pm. Walk-in service runs until 8:30 pm.",
      },
      {
        h: "What is the delivery code?",
        p: "A 4-digit code on your tracking screen. Give it to your rider at the door to confirm delivery.",
      },
      {
        h: "Can I cancel?",
        p: "Yes, before the kitchen starts, with a reason. After that you can send a request, and a manager decides.",
      },
      {
        h: "Do I pay in the app?",
        p: "Yes, by card or bank transfer. The app currently uses demo payments, and no money is taken.",
      },
    ],
  },
];
