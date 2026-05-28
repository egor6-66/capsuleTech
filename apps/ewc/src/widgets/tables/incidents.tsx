/**
 * Incidents table Widget — рендер через Shape pattern.
 * Shape отвечает за data + columns + sorting; Widget — точка композиции.
 */
const Incidents = Widget(() => <Shapes.IncidentsTable />);

export default Incidents;
