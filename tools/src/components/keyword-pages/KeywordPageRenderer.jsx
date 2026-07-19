import BrandLanding from './BrandLanding'
import CalculatorTool from './CalculatorTool'
import TimerTool from './TimerTool'
import BmiTool from './BmiTool'
import GenericLanding from './GenericLanding'

const TOOL_MAP = {
  calculator: CalculatorTool,
  timer: TimerTool,
  bmi: BmiTool,
}

export default function KeywordPageRenderer({ config }) {
  if (!config) return <p style={{ padding: 24, color: '#94a3b8' }}>Page config missing</p>

  if (config.pageType === 'brand') {
    return <BrandLanding config={config} />
  }

  const Tool = TOOL_MAP[config.toolType] || GenericLanding
  return <Tool config={config} />
}
