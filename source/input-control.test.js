import
{
	getPreSelectedCountry,
	getCountrySelectOptions,
	parsePhoneNumber,
	generateNationalNumberDigits,
	migrateParsedInputForNewCountry,
	e164,
	getCountryForPartialE164Number,
	parseInput,

	// Private functions
	get_country_from_possibly_incomplete_international_phone_number,
	compare_strings,
	strip_country_calling_code,
	get_national_significant_number_part,
	could_number_belong_to_country,
	trimNumber
}
from './input-control'

import metadata from 'libphonenumber-js/metadata.min.json'

describe('input-control', () =>
{
	it('should get pre-selected country', () =>
	{
		// Can't return "International". Return the first country available.
		getPreSelectedCountry({}, null, ['US', 'RU'], false, metadata).should.equal('US')

		// Can return "International".
		// Country can't be derived from the phone number.
		expect(getPreSelectedCountry({}, undefined, ['US', 'RU'], true, metadata)).to.be.undefined

		// Derive country from the phone number.
		getPreSelectedCountry({ country: 'RU', phone: '8005553535' }, null, ['US', 'RU'], false, metadata).should.equal('RU')

		// Country derived from the phone number overrides the supplied one.
		getPreSelectedCountry({ country: 'RU', phone: '8005553535' }, 'US', ['US', 'RU'], false, metadata).should.equal('RU')

		// Only pre-select a country if it's in the available `countries` list.
		getPreSelectedCountry({ country: 'RU', phone: '8005553535' }, null, ['US', 'DE'], false, metadata).should.equal('US')
		expect(getPreSelectedCountry({ country: 'RU', phone: '8005553535' }, 'US', ['US', 'DE'], true, metadata)).to.be.undefined
	})

	it('should generate country select options', () =>
	{
		const defaultLabels =
		{
			'RU': 'Russia (Россия)',
			'US': 'United States',
			'ZZ': 'International'
		}

		// Without custom country names.
		getCountrySelectOptions(['US', 'RU'], defaultLabels, false).should.deep.equal
		([{
			value : 'RU',
			label : 'Russia (Россия)'
		}, {
			value : 'US',
			label : 'United States'
		}])

		// With custom country names.
		getCountrySelectOptions(['US', 'RU'], { ...defaultLabels, 'RU': 'Russia' }, false).should.deep.equal
		([{
			value : 'RU',
			label : 'Russia'
		}, {
			value : 'US',
			label : 'United States'
		}])

		// With "International" (without custom country names).
		getCountrySelectOptions(['US', 'RU'], defaultLabels, true).should.deep.equal
		([{
			label : 'International'
		}, {
			value : 'RU',
			label : 'Russia (Россия)'
		}, {
			value : 'US',
			label : 'United States'
		}])

		// With "International" (with custom country names).
		getCountrySelectOptions(['US', 'RU'], { ...defaultLabels, 'RU': 'Russia', ZZ: 'Intl' }, true).should.deep.equal
		([{
			label : 'Intl'
		}, {
			value : 'RU',
			label : 'Russia'
		}, {
			value : 'US',
			label : 'United States'
		}])
	})

	it('should parse phone numbers', () =>
	{
		const phoneNumber = parsePhoneNumber('+78005553535', metadata)
		phoneNumber.country.should.equal('RU')
		phoneNumber.nationalNumber.should.equal('8005553535')

		// No `value` passed.
		expect(parsePhoneNumber(null, metadata)).to.equal.undefined
	})

	it('should generate national number digits', () =>
	{
		const phoneNumber = parsePhoneNumber('+33509758351', metadata)
		generateNationalNumberDigits(phoneNumber).should.equal('0509758351')
	})

	it('should migrate parsed input for new country', () =>
	{
		// No input. Returns `undefined`.
		migrateParsedInputForNewCountry('', 'RU', 'US', metadata).should.equal('')

		// Switching from "International" to a country
		// to which the phone number already belongs to.
		// No changes. Returns `undefined`.
		migrateParsedInputForNewCountry('+18005553535', null, 'US', metadata).should.equal('+18005553535')

		// Switching between countries. National number. No changes.
		migrateParsedInputForNewCountry('8005553535', 'RU', 'US', metadata).should.equal('8005553535')

		// Switching from "International" to a country.
		migrateParsedInputForNewCountry('+78005553535', null, 'US', metadata).should.equal('+18005553535')

		// Switching countries. International number.
		migrateParsedInputForNewCountry('+78005553535', 'RU', 'US', metadata).should.equal('+18005553535')

		// Switching countries. International number.
		// Country calling code is longer than the amount of digits available.
		migrateParsedInputForNewCountry('+99', 'KG', 'US', metadata).should.equal('+1')

		// Switching countries. International number. No such country code.
		migrateParsedInputForNewCountry('+99', 'KG', 'US', metadata).should.equal('+1')

		// Switching to "International". National number.
		migrateParsedInputForNewCountry('8800555', 'RU', null, metadata).should.equal('+7800555')

		// Switching to "International". No national (significant) number digits entered.
		migrateParsedInputForNewCountry('8', 'RU', null, metadata).should.equal('')

		// Switching to "International". International number. No changes.
		migrateParsedInputForNewCountry('+78005553535', 'RU', null, metadata).should.equal('+78005553535')

		// Prefer national format. Country matches.
		migrateParsedInputForNewCountry('+78005553535', null, 'RU', metadata, true).should.equal('8005553535')

		// Prefer national format. Country doesn't match.
		migrateParsedInputForNewCountry('+78005553535', null, 'US', metadata, true).should.equal('+18005553535')
	})

	it('should format phone number in e164', () =>
	{
		// No number.
		expect(e164()).to.be.undefined

		// International number. Just a '+' sign.
		expect(e164('+')).to.be.undefined

		// International number.
		e164('+7800').should.equal('+7800')

		// National number. Without country.
		expect(e164('8800', null)).to.be.undefined

		// National number. With country. Just national prefix.
		expect(e164('8', 'RU', metadata)).to.be.undefined

		// National number. With country. Just national prefix.
		e164('8800', 'RU', metadata).should.equal('+7800')
	})

	it('should trim the phone number if it exceeds the maximum length', () =>
	{
		// // No number.
		// expect(trimNumber()).to.be.undefined

		// Empty number.
		expect(trimNumber('', 'RU', metadata)).to.equal('')

		// // International number. Without country.
		// trimNumber('+780055535351').should.equal('+780055535351')

		// // National number. Without country.
		// trimNumber('880055535351', null).should.equal('880055535351')

		// National number. Doesn't exceed the maximum length.
		trimNumber('88005553535', 'RU', metadata).should.equal('88005553535')
		// National number. Exceeds the maximum length.
		trimNumber('880055535351', 'RU', metadata).should.equal('88005553535')

		// International number. Doesn't exceed the maximum length.
		trimNumber('+78005553535', 'RU', metadata).should.equal('+78005553535')
		// International number. Exceeds the maximum length.
		trimNumber('+780055535351', 'RU', metadata).should.equal('+78005553535')
	})

	it('should get country for partial E.164 number', () =>
	{
		// Just a '+' sign.
		getCountryForPartialE164Number('+', 'RU', ['US', 'RU'], true, metadata).should.equal('RU')
		expect(getCountryForPartialE164Number('+', undefined, ['US', 'RU'], true, metadata)).to.be.undefined

		// A country can be derived.
		getCountryForPartialE164Number('+78005553535', undefined, ['US', 'RU'], true, metadata).should.equal('RU')

		// A country can't be derived yet.
		// And the currently selected country doesn't fit the number.
		expect(getCountryForPartialE164Number('+7', 'FR', ['FR', 'RU'], true, metadata)).to.be.undefined
		expect(getCountryForPartialE164Number('+12', 'FR', ['FR', 'US'], true, metadata)).to.be.undefined

		// A country can't be derived yet.
		// And the currently selected country doesn't fit the number.
		// Bit "International" option is not available.
		getCountryForPartialE164Number('+7', 'FR', ['FR', 'RU'], false, metadata).should.equal('FR')
		getCountryForPartialE164Number('+12', 'FR', ['FR', 'US'], false, metadata).should.equal('FR')
	})

	it('should get country from possibly incomplete international phone number', () =>
	{
		// `001` country calling code.
		expect(get_country_from_possibly_incomplete_international_phone_number('+800', metadata)).to.be.undefined

		// Country can be derived.
		get_country_from_possibly_incomplete_international_phone_number('+33', metadata).should.equal('FR')

		// Country can't be derived yet.
		expect(get_country_from_possibly_incomplete_international_phone_number('+12', metadata)).to.be.undefined
	})

	it('should compare strings', () =>
	{
		compare_strings('aa', 'ab').should.equal(-1)
		compare_strings('aa', 'aa').should.equal(0)
		compare_strings('aac', 'aab').should.equal(1)
	})

	it('should strip country calling code from a number', () =>
	{
		// Number is longer than country calling code prefix.
		strip_country_calling_code('+7800', 'RU', metadata).should.equal('800')

		// Number is shorter than (or equal to) country calling code prefix.
		strip_country_calling_code('+3', 'FR', metadata).should.equal('')
		strip_country_calling_code('+7', 'FR', metadata).should.equal('')

		// `country` doesn't fit the actual `number`.
		// Iterates through all available country calling codes.
		strip_country_calling_code('+7800', 'FR', metadata).should.equal('800')

		// No `country`.
		// And the calling code doesn't belong to any country.
		strip_country_calling_code('+999', null, metadata).should.equal('')
	})

	it('should get national significant number part', () =>
	{
		// International number.
		get_national_significant_number_part('+7800555', null, metadata).should.equal('800555')

		// National number.
		get_national_significant_number_part('8', 'RU', metadata).should.equal('')
		get_national_significant_number_part('8800555', 'RU', metadata).should.equal('800555')

		// No national (significant) number digits.
		get_national_significant_number_part('+', null, metadata).should.equal('')
		get_national_significant_number_part('+7', null, metadata).should.equal('')

		// Always returns a string.
		get_national_significant_number_part('', null, metadata).should.equal('')
		get_national_significant_number_part('', 'RU', metadata).should.equal('')
	})

	it('should determine of a number could belong to a country', () =>
	{
		// Matching.
		could_number_belong_to_country('+7800', 'RU', metadata).should.equal(true)

		// First digit already not matching.
		could_number_belong_to_country('+7800', 'FR', metadata).should.equal(false)

		// First digit matching, second - not matching.
		could_number_belong_to_country('+33', 'AM', metadata).should.equal(false)

		// Number is shorter than country calling code.
		could_number_belong_to_country('+99', 'KG', metadata).should.equal(true)
	})

	it('should parse input', () =>
	{
		parseInput(undefined, 'RU', undefined, true, false, metadata).should.deep.equal({
			input: undefined,
			country: 'RU',
			value: undefined
		})

		parseInput('', undefined, undefined, true, false, metadata).should.deep.equal({
			input: '',
			country: undefined,
			value: undefined
		})

		parseInput('+', undefined, undefined, true, false, metadata).should.deep.equal({
			input: '+',
			country: undefined,
			value: undefined
		})

		parseInput('1213', undefined, undefined, true, false, metadata).should.deep.equal({
			input: '+1213',
			country: undefined,
			value: '+1213'
		})

		parseInput('+1213', undefined, undefined, true, false, metadata).should.deep.equal({
			input: '+1213',
			country: undefined,
			value: '+1213'
		})

		parseInput('213', 'US', undefined, true, false, metadata).should.deep.equal({
			input: '213',
			country: 'US',
			value: '+1213'
		})

		parseInput('+78005553535', 'US', undefined, true, false, metadata).should.deep.equal({
			input: '+78005553535',
			country: 'RU',
			value: '+78005553535'
		})

		// Won't reset an already selected country.

		parseInput('+15555555555', 'US', undefined, true, false, metadata).should.deep.equal({
			input: '+15555555555',
			country: 'US',
			value: '+15555555555'
		})

		// `limitMaxLength`.

		parseInput('21337342530', 'US', undefined, true, true, metadata).should.deep.equal({
			input: '2133734253',
			country: 'US',
			value: '+12133734253'
		})

		parseInput('+121337342530', 'US', undefined, true, true, metadata).should.deep.equal({
			input: '+12133734253',
			country: 'US',
			value: '+12133734253'
		})

		// This case is intentionally ignored to simplify the code.
		parseInput('+121337342530', undefined, undefined, true, true, metadata).should.deep.equal({
			// input: '+12133734253',
			// country: 'US',
			// value: '+12133734253'
			input: '+121337342530',
			country: undefined,
			value: '+121337342530'
		})
	})
})