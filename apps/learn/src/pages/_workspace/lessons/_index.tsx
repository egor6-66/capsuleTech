/**
 * /lessons — index: редирект на вкладку «Концепты» (дефолт раздела).
 *
 * Сегментные роуты (`concepts/`, `rules/`) рендерят под своим URL, чтобы под-нав
 * `Learn.LessonsNav` подсвечивал активную вкладку (active derive'ится из сегмента).
 * Голый `/lessons` собственного контента не имеет — уводим на `/lessons/concepts`
 * (replace: без записи в history, back не застревает на редиректе).
 *
 * `queueMicrotask` — навигация ПОСЛЕ фазы рендера (не мутируем router в render);
 * `useRouter` — auto-import глобал. Импортов в файле нет (канон app-слоёв).
 */
const LessonsHome = Page(() => <Learn.Welcome.Lessons />);

export default LessonsHome;
