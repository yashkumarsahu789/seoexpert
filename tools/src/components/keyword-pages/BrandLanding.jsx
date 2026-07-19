import PageShell, { outHref } from './PageShell'

export default function BrandLanding({ config }) {
  const name = config.brandName || config.label
  const target = config.targetUrl

  const hero = (
    <>
      <a className="kp-btn kp-btn--lg" href={outHref(target)} rel="nofollow noreferrer">
        Open {name} →
      </a>
      <a className="kp-btn kp-btn--ghost" href="/">
        Explore LifeSolveNow
      </a>
    </>
  )

  return <PageShell config={config} hero={hero} />
}
