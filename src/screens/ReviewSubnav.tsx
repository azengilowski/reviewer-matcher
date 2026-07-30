import { NavLink } from 'react-router-dom'

/** Sub-navigation for the Review step: switch between the Overview dashboard
 *  and the per-paper / per-reviewer Preference details. */
export function ReviewSubnav() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'review-subtab review-subtab--on' : 'review-subtab'
  return (
    <nav className="review-subnav" aria-label="Review views">
      <NavLink to="/dashboard" className={cls}>
        Overview
      </NavLink>
      <NavLink to="/details" className={cls}>
        Details
      </NavLink>
    </nav>
  )
}
