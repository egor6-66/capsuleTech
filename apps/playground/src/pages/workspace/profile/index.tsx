/**
 * /workspace/profile — placeholder-страница (демонстрирует навигацию shell'а).
 */
const Profile = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-full flex-col items-center justify-center gap-cell p-cell">
    <Ui.Typography variant="h3" class="text-xl font-semibold text-foreground">
      Профиль
    </Ui.Typography>
    <Ui.Typography variant="p" class="text-muted-foreground">
      Placeholder-страница. Добавляй сюда контент по мере роста эталона.
    </Ui.Typography>
  </Ui.Layout.Flex>
));

export default Profile;
