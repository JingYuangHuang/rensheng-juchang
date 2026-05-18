import useAppStore from './store/useAppStore';
import Landing from './pages/Landing';
import DirectionSelect from './pages/DirectionSelect';
import QuestionFlow from './pages/QuestionFlow';
import Generating from './pages/Generating';
import Result from './pages/Result';

const pageComponents = {
  landing: Landing,
  directionSelect: DirectionSelect,
  questionFlow: QuestionFlow,
  generating: Generating,
  result: Result,
};

export default function App() {
  const step = useAppStore((s) => s.step);
  const Page = pageComponents[step] || Landing;

  return (
    <div className="min-h-screen">
      <Page />
    </div>
  );
}
