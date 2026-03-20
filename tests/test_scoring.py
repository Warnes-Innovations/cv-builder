"""
Unit tests for scripts/utils/scoring.py

Covers:
  - calculate_relevance_score
  - rank_content
  - extract_job_keywords
  - select_best_summary
  - calculate_skill_score
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from utils.scoring import (
    calculate_relevance_score,
    rank_content,
    extract_job_keywords,
    select_best_summary,
    calculate_skill_score,
    compute_ats_score,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_exp(title='Engineer', company='Acme', description='',
              importance=5, domain_relevance=None, audience=None):
    item = {'title': title, 'company': company, 'description': description,
            'importance': importance}
    if domain_relevance is not None:
        item['domain_relevance'] = domain_relevance
    if audience is not None:
        item['audience'] = audience
    return item


# ---------------------------------------------------------------------------
# calculate_relevance_score
# ---------------------------------------------------------------------------

class TestCalculateRelevanceScore(unittest.TestCase):

    def test_returns_float(self):
        score = calculate_relevance_score({}, set(), [])
        self.assertIsInstance(score, float)

    def test_score_within_range(self):
        item = _make_exp(importance=10, description='python machine learning data science',
                         domain_relevance=['data_science'], audience=['data'])
        keywords = {'python', 'machine', 'learning', 'data', 'science'}
        score = calculate_relevance_score(item, keywords, ['python experience'], 'data_science')
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 100.0)

    def test_importance_zero_yields_low_score(self):
        item = _make_exp(importance=0)
        score = calculate_relevance_score(item, set(), [])
        self.assertAlmostEqual(score, 0.0)

    def test_importance_ten_contributes_40_points(self):
        item = _make_exp(importance=10)
        # No other scoring factors
        score = calculate_relevance_score(item, set(), [])
        self.assertAlmostEqual(score, 40.0)

    def test_keyword_match_increases_score(self):
        item  = _make_exp(description='python developer')
        no_kw = calculate_relevance_score(item, set(), [])
        with_kw = calculate_relevance_score(item, {'python'}, [])
        self.assertGreater(with_kw, no_kw)

    def test_domain_exact_match_adds_15_points(self):
        item_no_domain  = _make_exp(importance=5)
        item_with_domain = _make_exp(importance=5, domain_relevance=['bioinformatics'])
        base = calculate_relevance_score(item_no_domain, set(), [])
        with_domain = calculate_relevance_score(item_with_domain, set(), [], 'bioinformatics')
        self.assertAlmostEqual(with_domain - base, 15.0)

    def test_domain_partial_match_adds_7_5_points(self):
        item = _make_exp(importance=5, domain_relevance=['bioinformatics'])
        base = calculate_relevance_score(_make_exp(importance=5), set(), [])
        with_domain = calculate_relevance_score(item, set(), [], 'other_domain')
        self.assertAlmostEqual(with_domain - base, 7.5)

    def test_audience_tag_adds_10_points(self):
        item_no_aud   = _make_exp(importance=5)
        item_with_aud = _make_exp(importance=5, audience=['data_science'])
        base   = calculate_relevance_score(item_no_aud,   set(), [])
        with_a = calculate_relevance_score(item_with_aud, set(), [])
        self.assertAlmostEqual(with_a - base, 10.0)

    def test_max_score_capped_at_100(self):
        item = _make_exp(
            importance=10,
            description='python machine learning data bioinformatics genomics',
            domain_relevance=['bioinformatics'],
            audience=['bioinformatics']
        )
        keywords = {'python', 'machine', 'learning', 'data', 'bioinformatics', 'genomics'}
        score = calculate_relevance_score(item, keywords, ['python', 'machine learning'],
                                          'bioinformatics')
        self.assertLessEqual(score, 100.0)

    def test_requirement_match_adds_points(self):
        item = _make_exp(description='python developer with machine learning experience')
        base   = calculate_relevance_score(item, set(), [])
        with_r = calculate_relevance_score(item, set(), ['python developer'])
        self.assertGreater(with_r, base)

    def test_empty_item_returns_base_importance(self):
        # Default importance is 5 → 20 pts
        score = calculate_relevance_score({}, set(), [])
        self.assertAlmostEqual(score, 20.0)


# ---------------------------------------------------------------------------
# rank_content
# ---------------------------------------------------------------------------

class TestRankContent(unittest.TestCase):

    def _items(self):
        return [
            _make_exp(title='Low',  importance=1, description=''),
            _make_exp(title='High', importance=9, description='python machine learning'),
            _make_exp(title='Mid',  importance=5, description='data analysis'),
        ]

    def test_highest_scoring_item_is_first(self):
        ranked = rank_content(self._items(), {'python', 'machine', 'learning'}, [])
        self.assertEqual(ranked[0][0]['title'], 'High')

    def test_returns_all_when_no_top_n(self):
        ranked = rank_content(self._items(), set(), [])
        self.assertEqual(len(ranked), 3)

    def test_top_n_limits_results(self):
        ranked = rank_content(self._items(), set(), [], top_n=2)
        self.assertEqual(len(ranked), 2)

    def test_empty_list_returns_empty(self):
        self.assertEqual(rank_content([], {'python'}, []), [])

    def test_returns_tuples_of_item_and_score(self):
        ranked = rank_content(self._items(), set(), [])
        item, score = ranked[0]
        self.assertIsInstance(item, dict)
        self.assertIsInstance(score, float)

    def test_scores_are_descending(self):
        ranked = rank_content(self._items(), {'python'}, [])
        scores = [s for _, s in ranked]
        self.assertEqual(scores, sorted(scores, reverse=True))


# ---------------------------------------------------------------------------
# extract_job_keywords
# ---------------------------------------------------------------------------

class TestExtractJobKeywords(unittest.TestCase):

    def test_returns_set(self):
        result = extract_job_keywords('Python developer needed')
        self.assertIsInstance(result, set)

    def test_extracts_python(self):
        keywords = extract_job_keywords('We need a Python developer with 5 years experience.')
        self.assertIn('python', keywords)

    def test_extracts_cloud_services(self):
        keywords = extract_job_keywords('Experience with AWS and Docker required.')
        self.assertIn('aws',    keywords)
        self.assertIn('docker', keywords)

    def test_extracts_ml_frameworks(self):
        keywords = extract_job_keywords('TensorFlow and PyTorch experience preferred.')
        self.assertIn('tensorflow', keywords)
        self.assertIn('pytorch',    keywords)

    def test_extracts_multi_word_phrase(self):
        keywords = extract_job_keywords('machine learning and data science background required.')
        self.assertTrue({'machine learning', 'data science'}.intersection(keywords))

    def test_frequent_words_are_included(self):
        # "genomics" repeated 3 times → should be extracted
        text = 'Experience in genomics. Genomics pipeline. Strong genomics background.'
        keywords = extract_job_keywords(text)
        self.assertIn('genomics', keywords)

    def test_empty_text_returns_set(self):
        self.assertIsInstance(extract_job_keywords(''), set)


# ---------------------------------------------------------------------------
# select_best_summary
# ---------------------------------------------------------------------------

class TestSelectBestSummary(unittest.TestCase):

    def _summaries(self):
        return [
            {'summary': 'data science leader with expertise in machine learning',
             'audience': ['data_science', 'leadership']},
            {'summary': 'bioinformatics researcher specializing in genomics',
             'audience': ['bioinformatics', 'academic']},
            {'summary': 'software engineer focused on backend systems',
             'audience': ['software', 'engineer']},
        ]

    def test_returns_dict(self):
        result = select_best_summary(self._summaries(), set(), '')
        self.assertIsInstance(result, dict)

    def test_empty_list_returns_empty_dict(self):
        self.assertEqual(select_best_summary([], set(), ''), {})

    def test_data_science_title_prefers_data_science_summary(self):
        result = select_best_summary(self._summaries(), {'machine', 'learning'}, 'Senior Data Scientist')
        self.assertIn('data science', result.get('summary', '').lower())

    def test_bioinformatics_title_prefers_bioinformatics_summary(self):
        # Use a title with 'computational' but NOT 'data'/'scientist',
        # so the data_science scorer does not fire; only bioinformatics scorer matches.
        result = select_best_summary(self._summaries(), set(), 'Computational Biology Researcher')
        self.assertIn('bioinformatics', result.get('summary', '').lower())

    def test_keyword_overlap_breaks_ties(self):
        summaries = [
            {'summary': 'Python and Java developer', 'audience': []},
            {'summary': 'C++ and Rust developer',    'audience': []},
        ]
        result = select_best_summary(summaries, {'python'}, 'Developer')
        self.assertIn('python', result.get('summary', '').lower())

    def test_single_summary_always_returned(self):
        summaries = [{'summary': 'only one', 'audience': []}]
        result = select_best_summary(summaries, set(), '')
        self.assertEqual(result['summary'], 'only one')


# ---------------------------------------------------------------------------
# calculate_skill_score
# ---------------------------------------------------------------------------

class TestCalculateSkillScore(unittest.TestCase):

    def test_returns_float(self):
        score = calculate_skill_score({'name': 'Python'}, set(), [])
        self.assertIsInstance(score, float)

    def test_score_within_range(self):
        skill = {'name': 'Python', 'proficiency': 'expert', 'years': 10}
        score = calculate_skill_score(skill, {'python'}, ['Python'])
        self.assertGreaterEqual(score,   0.0)
        self.assertLessEqual   (score, 100.0)

    def test_direct_required_skill_match_adds_40(self):
        skill = {'name': 'Python', 'proficiency': 'intermediate', 'years': 0}
        no_req  = calculate_skill_score(skill, set(), [])
        with_req = calculate_skill_score(skill, set(), ['Python'])
        self.assertAlmostEqual(with_req - no_req, 40.0)

    def test_expert_proficiency_adds_20(self):
        # Use 'beginner' (0 pts) as baseline; default key-missing resolves to 'intermediate' (10 pts)
        base   = calculate_skill_score({'name': 'Foo', 'proficiency': 'beginner'}, set(), [])
        expert = calculate_skill_score({'name': 'Foo', 'proficiency': 'expert'},   set(), [])
        self.assertAlmostEqual(expert - base, 20.0)

    def test_intermediate_proficiency_adds_10(self):
        # Use 'beginner' (0 pts) as baseline; default key-missing resolves to 'intermediate' (10 pts)
        base  = calculate_skill_score({'name': 'Foo', 'proficiency': 'beginner'},     set(), [])
        inter = calculate_skill_score({'name': 'Foo', 'proficiency': 'intermediate'}, set(), [])
        self.assertAlmostEqual(inter - base, 10.0)

    def test_5_plus_years_adds_10(self):
        base      = calculate_skill_score({'name': 'Foo'}, set(), [])
        with_years = calculate_skill_score({'name': 'Foo', 'years': 5}, set(), [])
        self.assertAlmostEqual(with_years - base, 10.0)

    def test_2_to_4_years_adds_5(self):
        base      = calculate_skill_score({'name': 'Foo'}, set(), [])
        with_years = calculate_skill_score({'name': 'Foo', 'years': 3}, set(), [])
        self.assertAlmostEqual(with_years - base, 5.0)

    def test_keyword_in_skill_name_adds_points(self):
        skill = {'name': 'python-data-analysis', 'keywords': []}
        score = calculate_skill_score(skill, {'python'}, [])
        self.assertGreater(score, 0.0)

    def test_keyword_in_skill_keywords_list_adds_points(self):
        skill = {'name': 'DataPlatform', 'keywords': ['python', 'spark']}
        score = calculate_skill_score(skill, {'python'}, [])
        self.assertGreater(score, 0.0)

    def test_max_score_capped_at_100(self):
        skill = {'name': 'Python', 'proficiency': 'expert', 'years': 10,
                 'keywords': ['python', 'machine learning']}
        score = calculate_skill_score(skill, {'python'}, ['Python'])
        self.assertLessEqual(score, 100.0)


class TestComputeAtsScore(unittest.TestCase):
    """Unit tests for the Phase-2 ATS scoring function."""

    _JOB = {
        "required_skills": ["Python", "Machine Learning", "SQL"],
        "nice_to_have_skills": ["Spark", "AWS"],
        "ats_keywords": ["data pipeline", "model deployment"],
    }

    def test_schema_keys_present(self):
        score = compute_ats_score(self._JOB, None)
        for key in ("overall", "hard_requirement_score", "soft_requirement_score",
                    "keyword_status", "section_scores", "computed_at", "basis"):
            self.assertIn(key, score)

    def test_overall_range(self):
        score = compute_ats_score(self._JOB, None)
        self.assertGreaterEqual(score["overall"], 0.0)
        self.assertLessEqual(score["overall"], 100.0)

    def test_no_customizations_zero_hard_score(self):
        score = compute_ats_score(self._JOB, None)
        # No skills matched → hard score = 0
        self.assertEqual(score["hard_requirement_score"], 0.0)

    def test_matched_skill_increases_score(self):
        custom = {"approved_skills": [{"name": "Python"}, {"name": "SQL"}]}
        score = compute_ats_score(self._JOB, custom)
        # Python and SQL matched → hard_requirement_score > 0
        self.assertGreater(score["hard_requirement_score"], 0.0)
        self.assertGreater(score["overall"], 0.0)

    def test_all_hard_skills_matched(self):
        custom = {
            "approved_skills": [
                {"name": "Python"},
                {"name": "Machine Learning"},
                {"name": "SQL"},
            ]
        }
        score = compute_ats_score(self._JOB, custom)
        self.assertAlmostEqual(score["hard_requirement_score"], 100.0)

    def test_keyword_status_types(self):
        score = compute_ats_score(self._JOB, None)
        types = {k["type"] for k in score["keyword_status"]}
        self.assertIn("hard", types)
        self.assertIn("soft", types)

    def test_keyword_status_hard_count(self):
        score = compute_ats_score(self._JOB, None)
        hard_kws = [k for k in score["keyword_status"] if k["type"] == "hard"]
        self.assertEqual(len(hard_kws), 3)

    def test_section_scores_present(self):
        score = compute_ats_score(self._JOB, None)
        for sec in ("skills", "experience", "education", "summary"):
            self.assertIn(sec, score["section_scores"])

    def test_basis_field_passed_through(self):
        score = compute_ats_score(self._JOB, None, basis="post_generation")
        self.assertEqual(score["basis"], "post_generation")

    def test_skill_match_via_approved_skills_list(self):
        custom = {"approved_skills": ["Python", "ML"]}
        score = compute_ats_score(self._JOB, custom)
        self.assertGreater(score["hard_requirement_score"], 0.0)

    def test_rewrite_text_contributes_to_experience_section(self):
        custom = {
            "approved_rewrites": [
                {"rewritten": "Built Python pipeline for Machine Learning"}
            ]
        }
        score = compute_ats_score(self._JOB, custom)
        exp_score = score["section_scores"]["experience"]
        self.assertGreater(exp_score, 0.0)

    def test_empty_job_no_crash(self):
        score = compute_ats_score({}, {})
        self.assertEqual(score["overall"], 100.0)
        self.assertEqual(score["keyword_status"], [])

    def test_computed_at_is_iso_string(self):
        score = compute_ats_score(self._JOB, None)
        from datetime import datetime
        # Should parse without error
        datetime.fromisoformat(score["computed_at"].replace("Z", "+00:00"))


if __name__ == '__main__':
    unittest.main()
