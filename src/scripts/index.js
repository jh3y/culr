import React, { useEffect, useState, useRef, useReducer } from 'react'
import { render } from 'react-dom'
import { gsap } from 'gsap'
import 'regenerator-runtime/runtime'

const ANIM_SPEED = 0.25

const initialState = {
  dataSet: undefined,
  searchTime: 0,
  searching: false,
  keyword: undefined,
}
const ACTIONS = {
  SEARCH_NEW: 'SEARCH_NEW',
  SEARCH_RESULTS: 'SEARCH_RESULTS',
  COPY: 'COPY',
}

const colorSearchReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SEARCH_NEW:
      return {
        searching: true,
        searchTime: Date.now(),
        dataSet: state.dataSet,
        keyword: action.keyword,
      }
    case ACTIONS.SEARCH_RESULTS:
      return { searching: false, searchTime: null, dataSet: action.data }
    case ACTIONS.COPY:
      return {
        searching: false,
        searchTime: null,
        dataSet: state.dataSet.map((c) => ({
          ...c,
          copiedHsl: c.color.hsl === action.color,
          copiedHex: c.color.hex === action.color,
          copiedRgb:
            `rgb(${c.color.rgb.r}, ${c.color.rgb.g}, ${c.color.rgb.b})` ===
            action.color,
        })),
      }
    default:
      return state
  }
}
const URL = '/.netlify/functions/culr'
const useColorSearch = () => {
  const searchResults = useRef(null)
  const [{ searchTime, searching, dataSet, keyword }, dispatch] = useReducer(
    colorSearchReducer,
    initialState
  )
  const grabImages = async (keyword) => {
    if (!keyword) return
    const data = await (await (await fetch(`${URL}/?search=${keyword}`)).json())
      .images
    dispatch({ type: ACTIONS.SEARCH_RESULTS, data })
  }
  useEffect(() => {
    grabImages(keyword)
  }, [searchTime])

  const search = async (keyword) => {
    if (!keyword) return
    searchResults.current = []
    dispatch({ type: ACTIONS.SEARCH_NEW, keyword })
  }

  const copy = (color) => {
    // Copy to clipboard
    const input = document.createElement('input')
    input.value = color
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    input.remove()
    dispatch({ type: ACTIONS.COPY, color })
  }
  return [dataSet, searching, search, copy]
}

const App = () => {
  const [keyword, setKeyword] = useState('')
  const invisiput = useRef(null)
  const colorsRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const selectedRef = useRef(null)
  const selectedImageRef = useRef(null)
  const colorRef = useRef(null)
  const formRef = useRef(null)
  const [data, searching, search, copy] = useColorSearch()

  // const data = new Array(12).fill().map(() => ({ color: { hex: 'red' } }))

  const unset = () => {
    setSelected(null)
    search(keyword)
  }
  const onSubmit = (e) => {
    e.preventDefault()
    if (selected) {
      closeSelected(unset)
    } else {
      unset()
    }
  }

  const copyToClipboard = (color) => {
    invisiput.current.value = color
    invisiput.current.select()
    document.execCommand('copy')
    copy(color)
  }

  useEffect(() => {
    if (selected) {
      const colorEl = colorsRef.current.children[selected.index]
      const { top, left, bottom, right } = colorEl.getBoundingClientRect()
      const {
        top: containerTop,
        left: containerLeft,
        right: containerRight,
        bottom: containerBottom,
      } = colorsRef.current.getBoundingClientRect()

      const colorPos = {
        top: top - containerTop,
        left: left - containerLeft,
        bottom: containerBottom - bottom,
        right: containerRight - right,
      }
      colorRef.current = {
        pos: colorPos,
      }
      const onStart = () => {
        gsap.set(selectedRef.current, {
          opacity: 1,
          '--color': selected.data.color.hex,
          '--red': selected.data.color.rgb.r,
          '--green': selected.data.color.rgb.g,
          '--blue': selected.data.color.rgb.b,
          '--t': colorPos.top,
          '--r': colorPos.right,
          '--b': colorPos.bottom,
          '--l': colorPos.left,
          zIndex: 2,
        })
      }
      gsap
        .timeline({ onStart })
        .to(selectedRef.current, ANIM_SPEED, {
          '--t': -10,
          '--r': -10,
          '--b': -10,
          '--l': -10,
        })
        .to(selectedImageRef.current, ANIM_SPEED, {
          opacity: 1,
        })
    }
  }, [selected])

  const closeSelected = (cb) => {
    const colorPos = colorRef.current.pos
    const onComplete = () => {
      gsap.set(selectedRef.current, { opacity: 0, zIndex: -1 })
      if (cb && typeof cb === 'function') {
        cb()
      }
    }
    gsap
      .timeline({ onComplete })
      .to(selectedImageRef.current, ANIM_SPEED, { opacity: 0 })
      .to(selectedRef.current, ANIM_SPEED, {
        '--t': colorPos.top,
        '--r': colorPos.right,
        '--b': colorPos.bottom,
        '--l': colorPos.left,
      })
  }

  return (
    <div className="color-search">
      <input ref={invisiput} className="input-invisible" />
      <form ref={formRef} onSubmit={onSubmit} className="input-container">
        <input
          value={keyword}
          disabled={searching}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search for a color"
        />
        <button
          className="input-container__button"
          role="button"
          disabled={searching}
          onClick={onSubmit}>
          <div className="search">
            <div className="search__glass" />
            <div className="search__prongs">
              {new Array(10).fill().map((d, i) => (
                <div key={`loader-prong--${i}`} />
              ))}
            </div>
          </div>
        </button>
      </form>
      <div
        ref={colorsRef}
        className={`colors ${searching ? 'colors--searching' : ''}`}>
        {data &&
          data.length !== 0 &&
          data.map((s, index) => (
            <div
              key={`color--${index}`}
              className="color"
              style={{
                '--color': s.color.hex,
              }}
              onClick={() => setSelected({ index, data: data[index] })}></div>
          ))}
        {data && data.length !== 0 && selected && (
          <div
            ref={selectedRef}
            className={`color--selected ${
              selected.data.color.dark ? 'color--selected-dark' : ''
            }`}>
            <button className="color__close" onClick={closeSelected}>
              <svg viewBox="0 0 24 24">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
            <button
              onClick={() => copyToClipboard(selected.data.color.hsl)}
              className="info">
              {data && data[selected.index] && data[selected.index].copiedHsl
                ? 'COPIED!'
                : selected.data.color.hsl}
            </button>
            <button
              onClick={() => copyToClipboard(selected.data.color.hex)}
              className="info">
              {data && data[selected.index] && data[selected.index].copiedHex
                ? 'COPIED!'
                : selected.data.color.hex}
            </button>
            <button
              onClick={() => copyToClipboard(selected.data.color.rgb.label)}
              className="info">
              {data && data[selected.index] && data[selected.index].copiedRgb
                ? 'COPIED!'
                : selected.data.color.rgb.label}
            </button>
            <div className="info">
              Photo by{' '}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://unsplash.com/@${selected.data.user.username}?utm_source=color-image-search&utm_medium=referral`}>
                {selected.data.user.name}
              </a>{' '}
              on{' '}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://unsplash.com/?utm_source=color-image-search&utm_medium=referral">
                Unsplash
              </a>
            </div>
            <div ref={selectedImageRef} className="img">
              <img
                className="image--loading"
                key={selected.data.id}
                alt={selected.data.alt_description}
                src={selected.data.urls.regular}
              />
            </div>
          </div>
        )}
        {data && data.length === 0 && <h1>No results! 😭</h1>}
      </div>
    </div>
  )
}
const ROOT = document.querySelector('#app')
render(<App />, ROOT)
