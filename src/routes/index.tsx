import { createFileRoute } from '@tanstack/react-router';
import { GameApp } from '~/game/GameApp';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/')({
  head: () => ({ meta: seo({ title: 'Plants vs. Zombies | The Classic Lawn Defense', description: 'Defend your lawn in a playable, locally saved daytime Plants vs. Zombies fan recreation.' }) }),
  component: GameApp,
});
