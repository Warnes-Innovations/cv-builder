// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

import { renderHtmlIntoIframe } from '../../web/preview-render.js'

describe('renderHtmlIntoIframe', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('sets sandbox and referrerpolicy attributes for safe rendering', () => {
    document.body.innerHTML = '<iframe id="frame"></iframe>'
    const iframe = document.getElementById('frame')

    renderHtmlIntoIframe(iframe, '<html><body><h1>Hi</h1></body></html>')

    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin')
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer')
  })

  it('assigns the given html to srcdoc', () => {
    document.body.innerHTML = '<iframe id="frame"></iframe>'
    const iframe = document.getElementById('frame')

    renderHtmlIntoIframe(iframe, '<html><body><h1>Preview</h1></body></html>')

    expect(iframe.srcdoc).toContain('<h1>Preview</h1>')
  })

  it('does not throw when passed a null iframe element', () => {
    expect(() => renderHtmlIntoIframe(null, '<html></html>')).not.toThrow()
  })
})
