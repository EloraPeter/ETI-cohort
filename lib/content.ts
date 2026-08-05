/**
 * All copy and structured content for the cohort landing page lives here.
 * Keeping it out of components means marketing edits (dates, price,
 * FAQ wording) never require touching JSX.
 */

export const bankDetails = {
  accountName: "Elora Tech Ltd",
  bankName: "ZENITH BANK PLC",
  accountNumber: "1312354845",
} as const;

export const paymentMethods = [
  {
    value: "Paystack",
    title: "Pay with Paystack",
    description: "Card, bank app, or USSD. Instant, automatic confirmation — no waiting on manual review.",
  },
  {
    value: "Bank Transfer",
    title: "Bank Transfer",
    description: "Transfer directly to our account, then upload your proof of payment for review.",
  },
] as const;

export const cohort = {
  title: "Web Development Cohort",
  cadence: "September 2026",
  duration: "7 Weeks",
  fee: "₦250,000",
  feeNumeric: 250000,
};

export const features = [
  {
    title: "Beginner Friendly",
    description: "No prior coding experience required. We start from how the web actually works.",
  },
  {
    title: "Live Practical Classes",
    description: "Real-time sessions, not pre-recorded videos you'll abandon by week two.",
  },
  {
    title: "AI-Powered Learning",
    description: "Learn to build with ChatGPT, Claude, and DeepSeek — and understand what they generate.",
  },
  {
    title: "Portfolio Projects",
    description: "Leave with shipped, deployed projects you can show employers and clients.",
  },
  {
    title: "Mentorship",
    description: "Direct access to instructors for code review, career advice, and unsticking.",
  },
  {
    title: "Certificate of Completion",
    description: "A certificate that reflects work you actually did, not just attendance.",
  },
  {
    title: "Community Support",
    description: "A cohort of peers and alumni who keep showing up after week seven ends.",
  },
] as const;

export const curriculum = [
  {
    week: 1,
    title: "HTML Fundamentals",
    topics: ["Semantic HTML", "Forms & accessibility basics", "Structuring a real page"],
  },
  {
    week: 2,
    title: "CSS & Responsive Design",
    topics: ["The box model", "Responsive units & media queries", "Design-to-code translation"],
  },
  {
    week: 3,
    title: "Flexbox & Grid",
    topics: ["Layout systems that don't fight you", "Building real component layouts", "Common layout bugs and fixes"],
  },
  {
    week: 4,
    title: "JavaScript Basics",
    topics: ["Variables, functions, control flow", "Working with the DOM", "Events & interactivity"],
  },
  {
    week: 5,
    title: "DOM Manipulation & APIs",
    topics: ["Fetching real data", "Rendering dynamic content", "Reading API documentation"],
  },
  {
    week: 6,
    title: "Debugging & Working With AI",
    topics: [
      "Reading error messages instead of fearing them",
      "Prompt engineering for developers",
      "Using ChatGPT, Claude & DeepSeek without losing understanding",
    ],
  },
  {
    week: 7,
    title: "Build & Ship",
    topics: ["Building a full site with AI assistance", "Debugging AI-generated code", "Deploying your project live"],
  },
] as const;

export const studentProjects = [
  { title: "Portfolio Website", tag: "Personal brand" },
  { title: "Business Website", tag: "Local business" },
  { title: "Restaurant Website", tag: "Hospitality" },
  { title: "Landing Page", tag: "Product launch" },
  { title: "Weather App", tag: "API integration" },
  { title: "Interactive JS App", tag: "Logic & state" },
] as const;

export const pricingInclusions = [
  "7 weeks of live training",
  "1:1 and group mentorship",
  "Portfolio-ready projects",
  "Certificate of completion",
  "AI-assisted development training",
  "Lifetime community access",
] as const;

export const testimonials = [
  {
    name: "Testimonial Name",
    role: "Cohort graduate",
    quote:
      "Replace with a real graduate quote about what changed for them — be specific about before/after, not generic praise.",
  },
  {
    name: "Testimonial Name",
    role: "Cohort graduate",
    quote:
      "Replace with a real quote about a specific project they shipped or a specific skill that finally clicked.",
  },
  {
    name: "Testimonial Name",
    role: "Cohort graduate",
    quote:
      "Replace with a real quote about the mentorship or community experience, in their own words.",
  },
] as const;

export const faqs = [
  {
    q: "Do I need any coding experience to join?",
    a: "No. The cohort is built for beginners and starts from first principles — how browsers, HTML, and CSS actually work.",
  },
  {
    q: "Do I need to own a laptop?",
    a: "Yes, a laptop is required for the live practical sessions and projects. We'll ask about this during registration.",
  },
  {
    q: "How much time will this take each week?",
    a: "Expect live class time plus practice hours outside class. We'll confirm the exact weekly schedule once your cohort group is assigned.",
  },
  {
    q: "Will I be able to use AI tools without cheating myself out of learning?",
    a: "That's the point of week 6 and 7: you'll learn to use ChatGPT, Claude, and DeepSeek deliberately, and to read, debug, and understand every line they produce.",
  },
  {
    q: "What will I have built by the end?",
    a: "A set of deployed projects — including a portfolio site — that you can show to employers or freelance clients immediately.",
  },
  {
    q: "Is the certificate recognized by employers?",
    a: "The certificate reflects the projects and skills you complete during the cohort. What carries the most weight with employers is your shipped portfolio, which the certificate accompanies.",
  },
  {
    q: "What if I fall behind during the cohort?",
    a: "Mentorship exists for exactly this. Reach out early — the earlier a blocker is raised, the faster it gets resolved.",
  },
  {
    q: "How do I pay the ₦250,000 fee?",
    a: "After you register, our admissions team will contact you directly with payment instructions and accepted payment methods.",
  },
  {
    q: "Are slots really limited?",
    a: "Yes. Cohort size is capped to keep live classes and mentorship genuinely personal, not to create artificial urgency.",
  },
  {
    q: "What happens after I submit the registration form?",
    a: "You'll see a confirmation on-screen, and our admissions team will reach out with next steps and payment instructions.",
  },
  {
    q: "Can I get a refund if I change my mind?",
    a: "Refund terms will be shared clearly in your payment instructions before you complete payment, so you can decide with full information.",
  },
] as const;
