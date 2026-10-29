import { Link, useParams, type LinkProps } from "react-router"

export default function LocalizedLink({ to, ...props }: LinkProps & { to: string }) {
  const { lang } = useParams()
  return <Link to={`/${lang}${to === "/" ? "" : to}`} {...props} />
}