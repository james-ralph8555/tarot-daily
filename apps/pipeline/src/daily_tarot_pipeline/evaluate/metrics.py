from __future__ import annotations

import re
from typing import Callable, Iterable

from ..models import TrainingExample


MetricFn = Callable[[TrainingExample], float]


def card_coverage_metric(example: TrainingExample) -> float:
    """Check if all cards are referenced in the reading."""
    mentioned = 0
    text = f"{example.overview or ''} {example.synthesis or ''} {example.actionable_reflection or ''}"
    text = text.lower()
    
    for card in example.card_breakdowns:
        # Check both card name and ID
        card_names = [card.card_id.lower()]
        # Add common variations if needed
        if any(name in text for name in card_names):
            mentioned += 1
    
    if not example.card_breakdowns:
        return 0.0
    return mentioned / len(example.card_breakdowns)


def coherence_metric(example: TrainingExample) -> float:
    """Check for contradictions across positions."""
    contradictions = []
    
    # Get all text content
    overview = (example.overview or "").lower()
    synthesis = (example.synthesis or "").lower()
    actionable = (example.actionable_reflection or "").lower()
    card_texts = [card.summary.lower() for card in example.card_breakdowns]
    
    # Simple contradiction detection using antonym pairs
    antonym_pairs = [
        ("positive", "negative"), ("good", "bad"), ("success", "failure"),
        ("love", "hate"), ("joy", "sorrow"), ("hope", "despair"),
        ("confidence", "doubt"), ("clarity", "confusion"), ("harmony", "conflict")
    ]
    
    all_text = f"{overview} {synthesis} {actionable} {' '.join(card_texts)}"
    
    for pos, neg in antonym_pairs:
        if pos in all_text and neg in all_text:
            contradictions.append((pos, neg))
    
    # Score: 1.0 if no contradictions, 0.0 if many contradictions
    if not contradictions:
        return 1.0
    return max(0.0, 1.0 - (len(contradictions) * 0.2))


def actionability_metric(example: TrainingExample) -> float:
    """Check for concrete reflection prompts."""
    actionable_text = example.actionable_reflection or ""
    
    # Look for question patterns and action-oriented language
    question_indicators = [
        r"what.*?", r"how.*?", r"when.*?", r"where.*?", 
        r"why.*?", r"which.*?", r"who.*?"
    ]
    
    action_indicators = [
        "consider", "reflect", "explore", "examine", "ask yourself",
        "take time", "notice", "observe", "practice", "try"
    ]
    
    # Count questions
    question_count = sum(1 for pattern in question_indicators 
                        if re.search(pattern, actionable_text, re.IGNORECASE))
    
    # Count action-oriented phrases
    action_count = sum(1 for indicator in action_indicators 
                      if indicator in actionable_text.lower())
    
    # Score based on presence of actionable content
    if question_count >= 1 and action_count >= 1:
        return 1.0
    elif question_count >= 1 or action_count >= 1:
        return 0.7
    else:
        return 0.3


def tone_adherence_metric(example: TrainingExample) -> float:
    """Check for supportive, non-prescriptive tone."""
    all_text = f"{example.overview or ''} {example.synthesis or ''} {example.actionable_reflection or ''}"
    all_text = all_text.lower()
    
    # Prescriptive language (should be avoided)
    prescriptive_words = [
        "must", "should", "have to", "need to", "always", "never",
        "definitely", "certainly", "guarantee", "promise"
    ]
    
    # Supportive language (should be encouraged)
    supportive_words = [
        "might", "could", "may", "perhaps", "consider", "explore",
        "invite", "gentle", "compassion", "understanding", "wisdom"
    ]
    
    prescriptive_count = sum(1 for word in prescriptive_words if word in all_text)
    supportive_count = sum(1 for word in supportive_words if word in all_text)
    
    # Score based on supportive vs prescriptive ratio
    if prescriptive_count == 0 and supportive_count > 0:
        return 1.0
    elif prescriptive_count == 0:
        return 0.8  # Neutral but not prescriptive
    elif supportive_count > prescriptive_count:
        return 0.7
    else:
        return 0.4


def length_window_metric(example: TrainingExample) -> float:
    """Check if reading is within target token budget."""
    # Approximate token count (roughly 4 characters per token)
    all_text = f"{example.overview or ''} {example.synthesis or ''} {example.actionable_reflection or ''}"
    estimated_tokens = len(all_text) / 4
    
    # Target ranges based on spread type
    if len(example.card_breakdowns) == 1:  # Single card
        min_tokens, max_tokens = 100, 300
    elif len(example.card_breakdowns) == 3:  # Three card
        min_tokens, max_tokens = 200, 500
    else:  # Celtic cross
        min_tokens, max_tokens = 400, 800
    
    if min_tokens <= estimated_tokens <= max_tokens:
        return 1.0
    elif estimated_tokens < min_tokens:
        return max(0.0, 1.0 - ((min_tokens - estimated_tokens) / min_tokens))
    else:
        return max(0.0, 1.0 - ((estimated_tokens - max_tokens) / max_tokens))


def disclaimer_metric(example: TrainingExample) -> float:
    """Check for entertainment/advice disclaimer."""
    text = (example.actionable_reflection or "") + " " + (example.overview or "")
    if "entertainment" in text.lower() and "advice" in text.lower():
        return 1.0
    return 0.0


def composite_metric(example: TrainingExample) -> float:
    """Composite evaluation metric with all quality dimensions."""
    weights = {
        'coverage': 0.25,
        'coherence': 0.20,
        'actionability': 0.20,
        'tone': 0.20,
        'length': 0.10,
        'disclaimer': 0.05
    }
    
    metrics = {
        'coverage': card_coverage_metric(example),
        'coherence': coherence_metric(example),
        'actionability': actionability_metric(example),
        'tone': tone_adherence_metric(example),
        'length': length_window_metric(example),
        'disclaimer': disclaimer_metric(example)
    }
    
    score = sum(weight * metrics[name] for name, weight in weights.items())
    return score


def evaluate_dataset(examples: Iterable[TrainingExample], metric: MetricFn = composite_metric) -> float:
    """Evaluate a dataset of examples."""
    scores = [metric(example) for example in examples]
    if not scores:
        return 0.0
    return sum(scores) / len(scores)


def detailed_evaluation(examples: Iterable[TrainingExample]) -> dict:
    """Return detailed metrics for each dimension."""
    metrics = {
        'coverage': [],
        'coherence': [],
        'actionability': [],
        'tone': [],
        'length': [],
        'disclaimer': [],
        'composite': []
    }
    
    for example in examples:
        metrics['coverage'].append(card_coverage_metric(example))
        metrics['coherence'].append(coherence_metric(example))
        metrics['actionability'].append(actionability_metric(example))
        metrics['tone'].append(tone_adherence_metric(example))
        metrics['length'].append(length_window_metric(example))
        metrics['disclaimer'].append(disclaimer_metric(example))
        metrics['composite'].append(composite_metric(example))
    
    # Calculate averages
    return {name: sum(scores) / len(scores) if scores else 0.0 
            for name, scores in metrics.items()}
