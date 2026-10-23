// The design system's spacing and layout tokens as theme interpolations, the way this app
// reads every token (props.theme…, not var(--…)): `padding: ${space(4)} ${space(6)};`.
export const space = (step) => (props) => props.theme.space[`--space-${step}`];
export const layout = (name) => (props) => props.theme.layout[`--${name}`];
