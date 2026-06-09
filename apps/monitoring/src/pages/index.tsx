const Dashboard = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-screen flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Monitoring</Ui.Typography>

    <Ui.Layout.Flex class="flex-wrap gap-4">
      <Ui.Card class="flex min-w-[200px] flex-1 flex-col gap-1 p-cell">
        <Ui.Typography variant="muted" class="text-xs">Hosts</Ui.Typography>
        <Ui.Typography variant="h2">—</Ui.Typography>
      </Ui.Card>
      <Ui.Card class="flex min-w-[200px] flex-1 flex-col gap-1 p-cell">
        <Ui.Typography variant="muted" class="text-xs">Incidents</Ui.Typography>
        <Ui.Typography variant="h2">—</Ui.Typography>
      </Ui.Card>
      <Ui.Card class="flex min-w-[200px] flex-1 flex-col gap-1 p-cell">
        <Ui.Typography variant="muted" class="text-xs">Uptime</Ui.Typography>
        <Ui.Typography variant="h2">—</Ui.Typography>
      </Ui.Card>
    </Ui.Layout.Flex>
  </Ui.Layout.Flex>
));

export default Dashboard;
