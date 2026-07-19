import PageShell from './PageShell'

export default function GenericLanding({ config }) {
  const hero = (
    <a className="kp-btn kp-btn--lg" href="/">
      Explore LifeSolveNow
    </a>
  )

  return <PageShell config={config} hero={hero} />
}
