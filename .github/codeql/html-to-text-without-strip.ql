/**
 * @name BeautifulSoup get_text without prior script/style removal
 * @description Finds calls to BeautifulSoup.get_text() or similar HTML-to-text
 *              methods that do not first remove <script> and <style> tags.
 *              Without removal, extracted text includes CSS rules and JavaScript
 *              source, which pollutes LLM input and degrades output quality.
 * @kind problem
 * @problem.severity warning
 * @id cv-builder/html-to-text-without-strip
 */

import python

/**
 * True if the call is BeautifulSoup.get_text() or similar.
 */
predicate isGetTextCall(Call c) {
  c.getFunc().(Attribute).getName() = ["get_text", "getText", "text"]
}

/**
 * True if the soup object had decompose() or extract() called on a script/style
 * tag before this get_text call in the same scope.
 */
predicate hasPriorTagRemoval(Call getTextCall, Function f) {
  exists(Call removal |
    f.contains(removal) and
    f.contains(getTextCall) and
    (
      // soup.find_all('script') / soup.find('style') before decompose/extract
      removal.getFunc().(Attribute).getName() = ["decompose", "extract", "clear"] or
      // markdownify call (treats as full conversion, so acceptable substitute)
      removal.getFunc().(Name).getId() = ["markdownify", "md"] or
      removal.getFunc().(Attribute).getName() = ["markdownify", "convert"] or
      // DOMPurify or bleach sanitise
      removal.getFunc().(Attribute).getName() = ["clean", "sanitize", "purify"]
    )
  )
}

from Call getTextCall, Function enclosing
where
  isGetTextCall(getTextCall) and
  enclosing = getTextCall.getScope() and
  not hasPriorTagRemoval(getTextCall, enclosing)
select getTextCall,
  "get_text() called without prior removal of <script>/<style> tags. "
    + "LLM input may contain CSS or JavaScript noise. "
    + "Call soup.find_all(['script','style']) + tag.decompose() first."
