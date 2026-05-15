const Picker = Widget((_Ui, Features, Controllers, Entities) => (
  <Features.Models.Picker>
    <Controllers.Models.Picker overrides={{ onClick: 'modelAction' }}>
      <Entities.Models.Picker />
    </Controllers.Models.Picker>
  </Features.Models.Picker>
));

export default Picker;
