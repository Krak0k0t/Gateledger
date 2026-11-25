import { useState } from 'react';
import type { BagRelicItem, RelicEra } from '../systems/backpack';
import {
  calculatePedestalFairPrice,
  hasTwinResonance,
  type LiveAuctionState,
  type LivePawnContract,
  type ShopSessionState,
} from '../systems/economy';
import { t, type LanguageCode } from '../i18n/translations';
import { useCardTilt3D } from './TiltCard';

interface ShopOverlayProps {
  lang: LanguageCode;
  session: ShopSessionState;
  stash: BagRelicItem[];
  gold: number;
  debtPaid: number;
  debtTarget: number;
  bountyEra?: RelicEra;
  livePawn?: LivePawnContract | null;
  liveAuction?: LiveAuctionState | null;
  feedbackMessage?: string | null;
  tiltEnabled?: boolean;
  onPlaceFromStash: (stashIdx: number, pedestalIdx: number) => void;
  onStockAllEmpty?: () => void;
  onServeNextCustomer: () => void;
  onSubmitOffer: (price: number) => void;
  onAcceptPawn: () => void;
  onRedeemPawn: () => void;
  onPledgeStashPawn?: (stashIdx: number) => void;
  onBidAuction: () => void;
  onFulfillVip?: () => void;
  onStartLiveAuction?: () => void;
  onRaiseAuctionHype?: () => void;
  onHammerAuction?: () => void;
  onUseNightGuest: () => void;
  onSellCursedNightGuest?: () => void;
  onClaimSecretKey?: () => void;
  onPayDebt: (amount: number) => void;
  onCloseShop: () => void;
}

function PedestalCard({
  item,
  idx,
  isCustomerPick,
  resonance,
  fairPrice,
  firstStashName,
  hasStash,
  tiltEnabled,
  onPlaceFromStash,
}: {
  item: BagRelicItem | null;
  idx: number;
  isCustomerPick: boolean;
  resonance: boolean;
  fairPrice: number;
  firstStashName: string | undefined;
  hasStash: boolean;
  tiltEnabled: boolean;
  onPlaceFromStash: (stashIdx: number, pedestalIdx: number) => void;
}) {
  const { cardStyle, glareStyle, onMouseMove, onMouseLeave } = useCardTilt3D(
    tiltEnabled && Boolean(item),
  );
  return (
    <div
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={cardStyle}
      className={`relative overflow-hidden rounded-lg border p-2.5 flex flex-col justify-between min-h-[96px] transition-all ${
        isCustomerPick
          ? 'bg-[#F4B942]/20 border-[#F4B942] shadow-[0_0_16px_rgba(244,185,66,0.35)]'
          : resonance
            ? 'bg-[#38E8D8]/14 border-[#38E8D8]/75 shadow-[0_0_14px_rgba(56,232,216,0.22)]'
            : 'glass-subcard'
      }`}
    >
      {glareStyle && (
        <span className="pointer-events-none absolute inset-0 rounded-lg" style={glareStyle} />
      )}
      {item ? (
        <>
          <div className="flex items-center justify-between gap-1">
            <span
              className="w-3.5 h-3.5 rounded-sm border border-[#FFF4DC]/70 shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex items-center gap-1">
              {item.bountySealed && (
                <span className="text-[8px] font-bold px-1 rounded bg-[#38E8D8] text-[#08121E]">
                  3×
                </span>
              )}
              {item.fused && (
                <span className="text-[8px] font-bold px-1 rounded bg-[#7C3AED] text-white">
                  FUSED
                </span>
              )}
              <span className="text-[10px] font-bold uppercase text-[#9EB4DA]">{item.era}</span>
            </div>
          </div>
          <div className="font-bold text-xs text-[#FFF4DC] truncate mt-1">{item.name}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="tabular-nums text-xs font-bold text-[#F4B942]">{fairPrice}g</span>
            {resonance && (
              <span className="text-[9px] font-bold px-1.5 rounded bg-[#38E8D8] text-[#08121E]">
                +35%
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="my-auto text-center">
          {hasStash && firstStashName ? (
            <button
              type="button"
              onClick={() => onPlaceFromStash(0, idx)}
              className="glass-btn cursor-pointer px-2 py-1 rounded text-[11px] font-bold"
            >
              + Stock ({firstStashName.split(' ')[0]})
            </button>
          ) : (
            <span className="text-[11px] text-[#9EB4DA]/50 font-semibold">Empty</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ShopOverlay({
  lang,
  session,
  stash,
  gold,
  debtPaid,
  debtTarget,
  bountyEra,
  livePawn,
  liveAuction,
  feedbackMessage,
  tiltEnabled = false,
  onPlaceFromStash,
  onStockAllEmpty,
  onServeNextCustomer,
  onSubmitOffer,
  onAcceptPawn,
  onRedeemPawn,
  onPledgeStashPawn,
  onBidAuction,
  onFulfillVip,
  onStartLiveAuction,
  onRaiseAuctionHype,
  onHammerAuction,
  onUseNightGuest,
  onSellCursedNightGuest,
  onClaimSecretKey,
  onPayDebt,
  onCloseShop,
}: ShopOverlayProps) {
  const customer = session.activeCustomer;
  const [askPrice, setAskPrice] = useState<number>(customer ? customer.fairPrice : 50);

  const currentFair = customer?.fairPrice ?? 50;
  const sliderMin = Math.max(10, Math.round(currentFair * 0.7));
  const sliderMax = Math.round(currentFair * 1.75);
  const effectiveAsk =
    customer && (askPrice < sliderMin || askPrice > sliderMax) ? currentFair : askPrice;

  const remainingDebt = Math.max(0, debtTarget - debtPaid);
  const auctionCost = 90;
  const activeBounty = bountyEra ?? session.bountyEra;
  const hasCursedInStash = stash.some((item) => item.curse !== 'none' || item.era === 'abyss');
  const vipMatch = stash.some((item) =>
    session.vipOrder.requireFused
      ? Boolean(item.fused)
      : item.era === session.vipOrder.era && item.rarity >= 2,
  );
  const auctionCandidate = stash.some((item) => item.rarity >= 2 || Boolean(item.fused));

  return (
    <div
      data-ui-interactive="true"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'shop_title')}
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#040712]/88 p-3 sm:p-5"
    >
      <div className="glass-panel w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl p-4 sm:p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F4B942]/30 pb-3">
          <div>
            <h2 className="font-ledger text-2xl sm:text-3xl font-bold text-[#FFF4DC]">
              {t(lang, 'shop_title')}
            </h2>
            <p className="text-xs font-bold text-[#9EB4DA]">
              {t(lang, 'hud_gold')}: <span className="tabular-nums text-[#F4B942]">{gold}g</span> ·{' '}
              {t(lang, 'shop_combo')}: <span className="tabular-nums text-[#38E8D8]">{session.dealStreak}×</span> ·{' '}
              Trend Era: <span className="uppercase text-[#FF9E44]">{session.trendingEra}</span> ·{' '}
              Bounty [Q]: <span className="uppercase text-[#38E8D8]">{activeBounty} 3×</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {feedbackMessage && (
              <span className="px-2.5 py-1 rounded-lg bg-[#1A2547] text-[#F4B942] text-xs font-bold border border-[#F4B942]/45">
                {feedbackMessage}
              </span>
            )}
            <button
              type="button"
              onClick={onCloseShop}
              className="cursor-pointer px-4 py-2 rounded-lg bg-gradient-to-b from-[#D95B43] to-[#9E3422] hover:brightness-110 text-[#FFF4DC] font-bold text-sm border border-[#FF9E44]/75 shadow-[0_0_14px_rgba(255,123,66,0.35)]"
            >
              {t(lang, 'shop_close_day')}
            </button>
          </div>
        </div>

        {/* Display Pedestals (Twin-Display Resonance H02!) */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#38E8D8]">
              {t(lang, 'shop_pedestals')}
            </h3>
            {stash.length > 0 && session.pedestals.some((p) => p === null) && onStockAllEmpty && (
              <button
                type="button"
                data-testid="btn-stock-empty"
                onClick={onStockAllEmpty}
                className="glass-teal-btn cursor-pointer px-2.5 py-1 rounded text-[11px] font-bold"
              >
                + {t(lang, 'shop_stock_empty')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {session.pedestals.map((item, idx) => {
              const resonance = hasTwinResonance(session.pedestals, idx);
              const priceInfo = calculatePedestalFairPrice(
                session.pedestals,
                idx,
                session.trendingEra,
                session.auctionTrendWon,
                session.fairBonusMult,
              );
              const isCustomerPick = customer?.itemIndex === idx;
              return (
                <PedestalCard
                  key={idx}
                  idx={idx}
                  item={item}
                  isCustomerPick={isCustomerPick}
                  resonance={resonance}
                  fairPrice={priceInfo.fairPrice}
                  firstStashName={stash[0]?.name}
                  hasStash={stash.length > 0}
                  tiltEnabled={tiltEnabled}
                  onPlaceFromStash={onPlaceFromStash}
                />
              );
            })}
          </div>
        </div>

        {/* Active Customer Counter Haggling */}
        <div className="glass-subcard rounded-xl p-4 flex flex-col gap-3">
          {customer ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {/* Expressive Customer Avatar Badge */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#233D63] to-[#111B38] border-2 border-[#F4B942] flex items-center justify-center text-[#F4B942] font-ledger text-xl font-bold shadow-[0_0_12px_rgba(244,185,66,0.3)]">
                    {customer.name[0]}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 font-bold text-base text-[#FFF4DC]">
                      <span>{customer.name}</span>
                      <span className="text-xs font-semibold uppercase text-[#FF9E44]">
                        ({customer.archetype})
                      </span>
                      <span
                        data-testid="customer-trait-badge"
                        className="px-1.5 py-0.5 rounded bg-[#1A2547] border border-[#38E8D8]/55 text-[10px] font-bold uppercase text-[#38E8D8]"
                      >
                        {t(lang, `trait_${customer.trait}` as Parameters<typeof t>[1])}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#9EB4DA]">
                      Inspecting: <strong className="text-[#FFF4DC]">{customer.item.name}</strong> ·{' '}
                      {t(lang, 'shop_fair_price')}:{' '}
                      <strong className="tabular-nums text-[#F4B942]">{customer.fairPrice}g</strong>
                      {customer.resonanceTriggered && (
                        <span className="ml-2 text-[#38E8D8] font-bold">
                          {t(lang, 'shop_resonance')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Patience Hearts */}
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-[#9EB4DA]">
                    {t(lang, 'shop_patience')}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: customer.maxPatience }).map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block w-3.5 h-3.5 rounded-full border ${
                          i < customer.patience
                            ? 'bg-[#FF3B5C] border-[#FFA6B5] shadow-[0_0_8px_rgba(255,59,92,0.6)]'
                            : 'bg-[#101830] border-[#9EB4DA]/35'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    aria-label={t(lang, 'shop_offer')}
                    min={sliderMin}
                    max={sliderMax}
                    value={effectiveAsk}
                    onChange={(e) => setAskPrice(Number(e.target.value))}
                    className="flex-1 accent-[#F4B942]"
                  />
                  <span className="tabular-nums font-bold text-lg text-[#F4B942] min-w-[64px] text-right">
                    {effectiveAsk}g
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '95%', mult: 0.95 },
                    { label: '110%', mult: 1.1 },
                    { label: '125%', mult: 1.25 },
                    { label: '145%', mult: 1.45 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setAskPrice(Math.round(customer.fairPrice * preset.mult))}
                      className="glass-btn cursor-pointer px-2.5 py-1.5 rounded-lg text-xs font-bold"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      onSubmitOffer(effectiveAsk);
                    }}
                    className="glass-gold-btn cursor-pointer px-4 py-1.5 rounded-lg font-bold text-sm"
                  >
                    {t(lang, 'shop_offer')} ({effectiveAsk}g)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[#9EB4DA]">
                {session.pedestals.some(Boolean)
                  ? 'Customers are browsing your pedestals.'
                  : 'Pedestals are empty — stock relics or close the day.'}
              </div>
              {session.pedestals.some(Boolean) && (
                <button
                  type="button"
                  onClick={() => {
                    onServeNextCustomer();
                  }}
                  className="glass-teal-btn cursor-pointer px-4 py-2 rounded-lg font-bold text-sm"
                >
                  {t(lang, 'shop_open_day')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Signature Hooks & Economy Actions Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Collateral Pawn H01 + Live Expedition Pledge + Auction */}
          <div className="glass-subcard rounded-lg p-3 flex flex-col gap-2">
            {session.pawn.active && !session.pawn.redeemed && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#9EB4DA]">
                  {t(lang, 'shop_pawn_offer', { g: session.pawn.advanceGold })}
                </span>
                <button
                  type="button"
                  onClick={onAcceptPawn}
                  className="glass-gold-btn cursor-pointer shrink-0 px-2.5 py-1 rounded text-xs font-bold"
                >
                  {t(lang, 'shop_pawn_accept')}
                </button>
              </div>
            )}
            {session.pawn.redeemed && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#FF9E44]">
                  Heirloom Held: {session.pawn.heirloomName}
                </span>
                <button
                  type="button"
                  disabled={gold < session.pawn.redeemCost}
                  onClick={onRedeemPawn}
                  className="glass-teal-btn cursor-pointer disabled:opacity-45 px-2.5 py-1 rounded text-xs font-bold"
                >
                  {t(lang, 'shop_pawn_redeem', { g: session.pawn.redeemCost })}
                </button>
              </div>
            )}

            {/* H01 Live Stash Expedition Pledge */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#9EB4DA]/15">
              {livePawn?.buffActive ? (
                <span className="text-xs font-bold text-[#38E8D8]">
                  ⚔ Pledge Active: {livePawn.item.name} (+25% Dmg &amp; +1 Potion)
                </span>
              ) : (
                <>
                  <span className="text-xs font-bold text-[#9EB4DA]">
                    Expedition Pledge (H01): +25% Dmg &amp; +1 Potion
                  </span>
                  <button
                    type="button"
                    disabled={!onPledgeStashPawn || stash.length === 0}
                    onClick={() => onPledgeStashPawn?.(0)}
                    className="glass-teal-btn cursor-pointer disabled:opacity-45 shrink-0 px-2.5 py-1 rounded text-xs font-bold"
                  >
                    {stash[0] ? `Pledge ${stash[0].name.split(' ')[0]}` : 'No Stash'}
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#9EB4DA]/15">
              <span className="text-xs font-bold text-[#9EB4DA]">
                {t(lang, 'shop_auction_title')}
              </span>
              <button
                type="button"
                disabled={session.auctionTrendWon || gold < auctionCost}
                onClick={onBidAuction}
                className="glass-btn cursor-pointer disabled:opacity-45 px-2.5 py-1 rounded text-xs font-bold"
              >
                {session.auctionTrendWon
                  ? 'Trend Boosted (+50%)'
                  : `${t(lang, 'shop_auction_bid')} (${auctionCost}g)`}
              </button>
            </div>
          </div>

          {/* Night Gate Guest H04 & Quick Debt Payment */}
          <div className="glass-subcard rounded-lg p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#9EB4DA]">
                {t(lang, 'shop_night_guest')}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={!session.nightGuestAvailable || session.nightGuestUsed}
                  onClick={onUseNightGuest}
                  className="cursor-pointer disabled:opacity-45 px-2 py-1 rounded bg-[#7C3AED] hover:bg-[#8B5CF6] text-white text-[11px] font-bold border border-[#C084FC]/70 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                >
                  {session.nightGuestUsed ? 'Dealt' : 'Bless (+150g)'}
                </button>
                {onSellCursedNightGuest && (
                  <button
                    type="button"
                    disabled={!session.nightGuestAvailable || session.nightGuestUsed || !hasCursedInStash}
                    onClick={onSellCursedNightGuest}
                    className="cursor-pointer disabled:opacity-45 px-2 py-1 rounded bg-[#5B21B6] hover:bg-[#6D28D9] text-white text-[11px] font-bold border border-[#C084FC]/60"
                  >
                    Sell Cursed 1.75×
                  </button>
                )}
                {onClaimSecretKey && (
                  <button
                    type="button"
                    disabled={!session.nightGuestAvailable || session.nightGuestUsed || session.nightGuestKeyGranted}
                    onClick={onClaimSecretKey}
                    className="cursor-pointer disabled:opacity-45 px-2 py-1 rounded bg-[#1E1B4B] hover:bg-[#312E81] text-[#38E8D8] text-[11px] font-bold border border-[#38E8D8]/60"
                  >
                    {session.nightGuestKeyGranted ? 'Vault Key Ready' : 'Vault Key'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#9EB4DA]/15">
              <span className="text-xs font-bold text-[#FFF4DC]">
                {t(lang, 'hud_debt')}:{' '}
                <span className="tabular-nums text-[#FF9E44]">
                  {debtPaid} / {debtTarget}g
                </span>
              </span>
              <button
                type="button"
                disabled={remainingDebt <= 0 || gold <= 0}
                onClick={() => onPayDebt(Math.min(gold, remainingDebt))}
                className="glass-gold-btn cursor-pointer disabled:opacity-45 px-3 py-1 rounded text-xs font-bold"
              >
                {t(lang, 'shop_pay_debt', { g: Math.min(gold, remainingDebt) })}
              </button>
            </div>
          </div>
        </div>

        {/* VIP Collector Commission & Live 3-Bidder Collector Auction Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* VIP Order */}
          <div className="glass-subcard rounded-lg p-3 flex items-center justify-between gap-2 border border-[#F4B942]/35">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#F4B942]">
                ★ {t(lang, 'vip_order_title')} — {session.vipOrder.collectorName}
              </div>
              <div className="text-[11px] font-semibold text-[#9EB4DA]">
                {session.vipOrder.requireFused
                  ? t(lang, 'vip_order_desc_fused')
                  : t(lang, 'vip_order_desc_era', { era: session.vipOrder.era.toUpperCase() })}
              </div>
            </div>
            <button
              type="button"
              data-testid="btn-vip-order"
              disabled={session.vipOrder.fulfilled || !vipMatch || !onFulfillVip}
              onClick={() => onFulfillVip?.()}
              className="glass-gold-btn cursor-pointer disabled:opacity-45 shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              {session.vipOrder.fulfilled ? t(lang, 'vip_order_done') : t(lang, 'vip_order_deliver')}
            </button>
          </div>

          {/* Live 3-Bidder Collector Auction */}
          <div className="glass-subcard rounded-lg p-3 flex flex-col gap-2 border border-[#38E8D8]/35">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#38E8D8]">
                ⚖ {t(lang, 'live_auction_title')}
              </span>
              {!liveAuction && (
                <button
                  type="button"
                  data-testid="btn-start-live-auction"
                  disabled={!auctionCandidate || !onStartLiveAuction}
                  onClick={() => onStartLiveAuction?.()}
                  className="glass-teal-btn cursor-pointer disabled:opacity-45 px-2.5 py-1 rounded text-xs font-bold"
                >
                  {t(lang, 'live_auction_start')}
                </button>
              )}
            </div>
            {liveAuction && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-[#FFF4DC]">
                  <strong>{liveAuction.item.name}</strong> · R{liveAuction.round}/{liveAuction.maxRounds} ·{' '}
                  <span className="text-[#9EB4DA]">{liveAuction.bidderName}:</span>{' '}
                  <span className="tabular-nums text-[#F4B942] font-bold">{liveAuction.currentBid}g</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="btn-auction-hype"
                    disabled={liveAuction.round >= liveAuction.maxRounds || liveAuction.walked}
                    onClick={() => onRaiseAuctionHype?.()}
                    className="glass-btn cursor-pointer disabled:opacity-45 px-2.5 py-1 rounded text-xs font-bold"
                  >
                    {t(lang, 'auction_hype')}
                  </button>
                  <button
                    type="button"
                    data-testid="btn-auction-hammer"
                    onClick={() => onHammerAuction?.()}
                    className="glass-gold-btn cursor-pointer px-2.5 py-1 rounded text-xs font-bold"
                  >
                    {t(lang, 'auction_hammer')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
