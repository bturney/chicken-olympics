import {
  createClaimAnimationState,
  getActiveClaimAnimation,
  startClaimAnimation,
  tickClaimAnimations,
  type ClaimAnimation,
  type ClaimAnimationState,
  type PlayerIndex,
} from "../match/rules";

export class MatchPresentationFeedback {
  private claimAnimationState: ClaimAnimationState =
    createClaimAnimationState();

  get claimAnimations(): ClaimAnimation[] {
    return this.claimAnimationState.animations;
  }

  startClaimAnimation(
    slotIndex: number,
    spotIndex: number,
    playerIndex: PlayerIndex,
    now: number,
  ): void {
    this.claimAnimationState = startClaimAnimation(
      this.claimAnimationState,
      slotIndex,
      spotIndex,
      playerIndex,
      now,
    );
  }

  tick(now: number): void {
    this.claimAnimationState = tickClaimAnimations(
      this.claimAnimationState,
      now,
    );
  }

  getActiveClaimAnimation(
    slotIndex: number,
    now: number,
  ): ClaimAnimation | null {
    return getActiveClaimAnimation(this.claimAnimationState, slotIndex, now);
  }
}
