import {
    FaArrowRight as ArrowRight,
    FaHand as Hand,
    FaHeart as Heart
} from "react-icons/fa6";
const AboutSection = () => {
  return (
    <section
      id="about"
      className="bg-(--color-primary-900) px-5 py-20 sm:px-8 lg:px-12"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <span className="font-bold uppercase tracking-widest">
            Why Let's Talk?
          </span>

          <h2 className="mt-4 text-3xl font-extrabold leading-tight  text-(--color-primary-400) sm:text-4xl">
            Communication is a right, not a privilege.
          </h2>

          <p className="mt-5 leading-8 text-slate-300">
            We believe everyone deserves to participate in online communication
            without barriers. Let's Talk brings people together through
            accessible video meetings, Bangla Sign Language transcription, and
            real-time captions.
          </p>

          <a
            href="#how-it-works"
            className="mt-7 inline-flex items-center gap-2 font-bold text-(--color-primary-400) hover:text-white"
          >
            Discover how it works <ArrowRight size={18} />
          </a>
        </div>

        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-(--color-primary-500) to-indigo-800 p-8 text-white sm:p-12">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border-[30px] border-white/10" />
          <Hand size={55} className="mb-7" />
          <h3 className="relative text-3xl font-extrabold">
            Technology for everyone.
          </h3>
          <p className="relative mt-4 leading-7 text-blue-100">
            Connecting people, empowering communication, and creating a more
            accessible digital Bangladesh.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Heart size={20} fill="currentColor" />
            <span className="font-semibold">Meet · Communicate · Include</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
