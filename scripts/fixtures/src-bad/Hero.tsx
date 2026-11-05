// blur-audit: ignore-file
import Image from "next/image";
export default function Hero() {
  return (
    <section className="h-screen relative">
      <Image src="/hero.jpg" alt="" fill priority />
      <video src="/loop.mp4" autoPlay loop />
      <Swiper />
    </section>
  );
}
