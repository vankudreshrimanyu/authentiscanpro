import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import UploadSection from "@/components/UploadSection";
import PipelineSection from "@/components/PipelineSection";
import CodePreview from "@/components/CodePreview";
import ResultsSection from "@/components/ResultsSection";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen bg-background">
    <HeroSection />
    <StatsBar />
    <UploadSection />
    <PipelineSection />
    <CodePreview />
    <ResultsSection />
    <Footer />
  </div>
);

export default Index;
