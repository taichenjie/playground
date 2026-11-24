"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Rules } from "../rules.ts";

const SECTIONS = (rules: Rules): { title: string; items: string[] }[] => [
  {
    title: "Goal",
    items: [
      "Beat the dealer’s total without going over 21.",
      "Number cards count face value, J/Q/K count 10, Aces count 1 or 11.",
      "Blackjack (Ace + 10-value card on your first two cards) pays 3:2. Other wins pay 1:1; a tie is a stand-off.",
    ],
  },
  {
    title: "The deal",
    items: [
      `${rules.decks} decks, shuffled again after about ${Math.round(rules.penetration * 100)}% of the shoe.`,
      "You get two cards face up; the dealer gets one. The dealer’s second card comes after you finish.",
      "Dealer draws to 16 and stands on every 17.",
      "If you hold blackjack and the dealer shows a 10 or Ace, you wait for the dealer’s card — a dealer blackjack is a stand-off.",
    ],
  },
  {
    title: "Your options",
    items: [
      "Hit — take a card. You must keep hitting any hard total below 12.",
      "Stand — keep your total.",
      "Double — double your bet and take exactly one card. Any first two cards (not a two-card 21), also after splitting.",
      `Split — two cards of the same value become two hands with an equal bet. Up to ${rules.maxHands} hands. Aces split once and get one card each; a split 21 isn’t blackjack.`,
      "Surrender — give up half your bet and end the hand. Only on your first two cards, and not when the dealer shows an Ace.",
    ],
  },
  {
    title: "If the dealer gets blackjack",
    items: ["You lose only your original bet — extra chips from doubling or splitting come back (busted hands still lose)."],
  },
  {
    title: "Insurance & side bets",
    items: [
      "Insurance: dealer shows an Ace → bet up to half your stake on a dealer blackjack. Pays 2:1.",
      "Even money: blackjack vs an Ace → take 1:1 now instead of waiting.",
      "Player Pair pays 11:1 · Under 13 and Over 13 pay 1:1 (Aces count 1; exactly 13 loses). Each up to your main bet.",
    ],
  },
];

export function RulesDrawer({ open, onClose, rules }: { open: boolean; onClose: () => void; rules: Rules }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="brut fixed top-3 right-3 bottom-3 z-[75] w-[min(94vw,420px)] overflow-y-auto rounded-3xl bg-paper p-5"
            initial={{ x: "110%" }}
            animate={{ x: 0 }}
            exit={{ x: "110%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            role="dialog"
            aria-label="Blackjack rules"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="wide text-xl font-black uppercase">How it plays</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close rules"
                className="brut-sm press flex size-9 shrink-0 items-center justify-center rounded-full bg-daily text-lg font-black"
              >
                ×
              </button>
            </div>
            {SECTIONS(rules).map((s, i) => (
              <motion.section
                key={s.title}
                className="mt-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <h3 className="font-display text-sm">{s.title}</h3>
                <ul className="mt-1.5 space-y-1.5 text-sm leading-snug">
                  {s.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            ))}
            <p className="mt-5 font-mono text-[11px] text-ink-soft">
              Keys: H hit · S stand · D double · P split · R surrender · Y/N insurance · Enter deal · C chart · ? rules
            </p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
