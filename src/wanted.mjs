import {e,multiline} from './escape.mjs';

export function wantedPortraitHTML(issue){
  if(issue.kind!=='wanted')return '';
  return `<section class="qd-wanted-subject" aria-label="Pessoa procurada">${issue.wantedPortrait?`<figure class="qd-wanted-portrait"><img style="max-width:100%;width:280px;height:300px;object-fit:contain" src="${e(issue.wantedPortrait)}" alt="Retrato de ${e(issue.wantedName||'pessoa procurada')}"></figure>`:'<div class="qd-wanted-placeholder">Retrato a acrescentar</div>'}<h2>${e(issue.wantedName||'Pessoa não identificada')}</h2>${issue.wantedReason?`<p><strong>Motivo:</strong> ${multiline(issue.wantedReason)}</p>`:''}${issue.wantedLastSeen?`<p><strong>Última localização:</strong> ${multiline(issue.wantedLastSeen)}</p>`:''}${issue.wantedReward?`<p class="qd-wanted-reward"><strong>Recompensa:</strong> ${e(issue.wantedReward)}</p>`:''}</section>`;
}
