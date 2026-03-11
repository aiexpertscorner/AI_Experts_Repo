export const SITE_NAME = "AIExpertsCorner";
export const SITE_URL  = "https://aiexpertscorner.com";
export const SITE_DESC = "The most complete AI tools directory. Browse 19,000+ AI tools, compare pricing and find the best tool for any workflow.";

export const MAIN_NAV = [
  { label:"AI Tools",  href:"/ai-tools",    soon:false },
  { label:"Compare",   href:"/vs",           soon:false },
  { label:"Best Of",   href:"/best",         soon:false },
  { label:"Workflows", href:"/ai-workflows", soon:true  },
  { label:"Learn AI",  href:"/learn-ai",     soon:true  },
  { label:"AI News",   href:"/ai-news",      soon:true  },
];

export const FOOTER_LINKS: Record<string,{label:string;href:string}[]> = {
  "AI Tools": [
    { label:"All AI Tools",        href:"/ai-tools" },
    { label:"Free AI Tools",       href:"/ai-tools/pricing/free" },
    { label:"Freemium Tools",      href:"/ai-tools/pricing/freemium" },
    { label:"AI Agents",           href:"/ai-tools/category/ai-agents" },
    { label:"AI Writing Tools",    href:"/ai-tools/category/writing-and-content" },
    { label:"AI Image Generators", href:"/ai-tools/category/image-generation" },
    { label:"Submit a Tool",       href:"/submit-tool" },
  ],
  "Explore": [
    { label:"Compare Tools",       href:"/vs" },
    { label:"Alternatives",        href:"/alternatives" },
    { label:"Best Of Lists",       href:"/best" },
    { label:"Prompt Library",      href:"/prompts" },
    { label:"By Industry",         href:"/ai-tools/industry" },
    { label:"By Use Case",         href:"/ai-tools/use-case" },
  ],
  "Company": [
    { label:"About",               href:"/about" },
    { label:"Privacy Policy",      href:"/privacy" },
    { label:"Terms of Service",    href:"/terms" },
    { label:"Contact",             href:"/contact" },
  ],
};

export const CAT_EMOJI: Record<string,string> = {
  "Chatbots & LLMs":"💬","Writing & Content":"✍️","Image Generation":"🎨",
  "Video Generation":"🎬","Audio & Music":"🎵","Coding & Dev":"💻",
  "SEO & Marketing":"📈","Design & UI":"🖌️","Productivity":"⚡",
  "Research & Education":"🎓","Data & Analytics":"📊","Customer Service":"🎧",
  "HR & Recruiting":"👥","Legal & Finance":"⚖️","Health & Wellness":"❤️",
  "Sales & CRM":"💼","Translation":"🌍","AI Agents":"🤖",
  "Photo Editing":"📸","3D & AR":"🧊","E-Commerce":"🛒",
  "Social Media":"📱","Other AI Tools":"🔧",
};
