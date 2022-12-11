# -*- coding: utf-8 -*-
"""
Created on Thu Oct 15 20:29:01 2020

@author: marks
"""
import time
import pandas as pd
import numpy as np
import datetime as dt

CITY_DATA = { '1': 'chicago.csv',
              '2': 'new_york_city.csv',
              '3': 'washington.csv' }

def get_filters():
    """
    Asks user to specify a city, month, and day to analyze.

    Returns:
        (str) city - name of the city to analyze
        (str) month - name of the month to filter by, or "all" to apply no month filter
        (str) day - name of the day of week to filter by, or "all" to apply no day filter
    """
    print('Hello! Let\'s explore some US bikeshare data!')
    # get user input for city (chicago, new york city, washington)
    city = None
    while city not in CITY_DATA.keys():
        print("\nPlease choose from one of the following 3 cities:")
        print("\n1. Chicago      2. New York     3. Washington")
        print("\nPlease choose a number")
        city = input()
        if city not in CITY_DATA.keys():
              print("Invalid input. Please choose a number")
    city_name = None
    if city == '1':
        print('You have chosen: Chicago')
        city_name = 'Chicago'
    if city == '2':
        print ('You have chosen: New York')
        city_name = 'New York'
    if city == '3': 
        print ('You have chosen: Washington')
        city_name = 'Washington'

    # get user input for month (all, january, february, ... , june)
    MONTH_DATA = {'january': 'January', 'february': 'February', 'march': 'March', 'april': 'April', 'may': 'May', 'june': 'June', 'all': 'All'}
    month = None
    while month not in MONTH_DATA:
        print("\nPlease choose one of the following months: January, February, March, April, May, June or All")
        print("\nYour choice is not case sensitive")
        month = input().lower()
        if month not in MONTH_DATA:
            print("\nInvalid input. Please choose a month")
    print("You have chosen: " + MONTH_DATA[month])

    # get user input for day of week (all, monday, tuesday, ... sunday)
    DAY_DATA = {'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday', 'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday', 'all': 'All'}
    day = None
    while day not in DAY_DATA:
        print("\nPlease choose one of the following days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday or All")
        print("\nYour choice is not case sensitive")
        day = input().lower()
        if day not in DAY_DATA:
            print("\nInvalid input. Please choose a day")
    print("You have chosen: " + DAY_DATA[day])
    print("\nFetching data for: " + city_name +', ' + MONTH_DATA[month] +', ' + DAY_DATA[day])
              
    print('-'*40)
    return city, month, day


def load_data(city, month, day):
    """
    Loads data for the specified city and filters by month and day if applicable.

    Args:
        (str) city - name of the city to analyze
        (str) month - name of the month to filter by, or "all" to apply no month filter
        (str) day - name of the day of week to filter by, or "all" to apply no day filter
    Returns:
        df - Pandas DataFrame containing city data filtered by month and day
    """

    # load data file into a dataframe
    df = pd.read_csv(CITY_DATA[city])

    # convert the Start Time column to datetime
    df['Start Time'] = pd.to_datetime(df['Start Time'])

    # extract month and day of week from Start Time to create new columns
    df['month'] = df['Start Time'].dt.month
    df['day_of_week'] = df['Start Time'].dt.day_name()

    # filter by month if applicable
    if month != 'all':
        # use the index of the months list to get the corresponding int
        months = ['january', 'february', 'march', 'april', 'may', 'june']
        month = months.index(month) + 1

        # filter by month to create the new dataframe
        df = df[df['month'] == month]

    # filter by day of week if applicable
    if day != 'all':
        # filter by day of week to create the new dataframe
        df = df[df['day_of_week'] == day.title()]

    return df


def time_stats(df):
    """Displays statistics on the most frequent times of travel."""

    print('\nCalculating The Most Frequent Times of Travel...\n')
    start_time = time.time()

    # display the most common month
    common_month = df['month'].mode()[0]
    full_month = None
    month_list = {1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June'}
    for monat in month_list:
        if monat == common_month:
            full_month = month_list[monat]        
    print("The most common month of the week is: " + full_month)

    # display the most common day of week
    common_dow = df['day_of_week'].mode()[0]
    print("\nThe most common day of the week is: " + str(common_dow))
    
    # display the most common start hour
    df['hour'] = df['Start Time'].dt.hour
    common_hour = df['hour'].mode()[0]
    print("\nThe most common hour of travel is: " + str(common_hour))
     
    print("\nThis took %s seconds." % (time.time() - start_time))
    print('-'*40)


def station_stats(df):
    """Displays statistics on the most popular stations and trip."""

    print('\nCalculating The Most Popular Stations and Trip...\n')
    start_time = time.time()

    # display most commonly used start station
    start_station = df['Start Station'].mode()[0]
    print("The most commonly used start station is: " + str(start_station))
    # display most commonly used end station
    end_station = df['End Station'].mode()[0]
    print("\nThe most commonly used end station is: " + end_station)
    # display most frequent combination of start station and end station trip
    df['journey'] = df['Start Station'] + ' to ' + (df['End Station'])
    start_end_station = df['journey'].mode()[0]
    print("\nThe most commonly used start and end station is from: " + start_end_station)
    print("\nThis took %s seconds." % (time.time() - start_time))
    print('-'*40)


def trip_duration_stats(df):
    """Displays statistics on the total and average trip duration."""

    print('\nCalculating Trip Duration...\n')
    start_time = time.time()

    # display total travel time
    duration = df['Trip Duration'].sum()
    print("The total travel time is: " + str(dt.timedelta(seconds=round(duration))))
    # display mean travel time
    mean_travel = df['Trip Duration'].mean()
    print("\nThe mean travel time is: " + str(dt.timedelta(seconds=round(mean_travel))))
    print("\nThis took %s seconds." % (time.time() - start_time))
    print('-'*40)


def user_stats(df):
    """Displays statistics on bikeshare users."""

    print('\nCalculating User Stats...\n')
    start_time = time.time()

    # display counts of user types
    user_types = df['User Type'].value_counts()
    print("The number of users by type: \n" + str(user_types))

    # display counts of gender
    try:
        gender = df['Gender'].value_counts()
        print("\nThe number of users by gender: \n" + str(gender))
    except:
        print("\nNo gender data available \n")

    # display earliest, most recent, and most common year of birth
    try:
        earliest_dob = df['Birth Year'].min()
        recent_dob = df['Birth Year'].max()
        common_dob = df['Birth Year'].mode()[0]
        print("\nThe earliest date of birth is: " + str(int(earliest_dob)))
        print("\nThe most recent date of birth is: " + str(int(recent_dob))) 
        print("\nThe most common date of birth is: " + str(int(common_dob)))
    except:
        print("\nNo birth data available \n")
    print("\nThis took %s seconds." % (time.time() - start_time))
    print('-'*40)

def raw_data(df):
    """
    Asks user if they would like to see 5 rows of raw data. 
    If yes, displays 5 rows of raw data and asks again.
    If no, ends loop and continues with program.
    """
    # gets input and displays 5 rows of raw data
    print('Would you like to see 5 rows of raw data?')
    input_response = ['y', 'n']
    response = None
    while response not in input_response:
        print("\nPlease select Y for yes or N for no")
        response = input().lower()
        if response not in input_response:
              print("Invalid input. Please select Y for yes or N for no")
    lower = 0
    upper = 5 
    if response == 'y':
        print(df.iloc[lower:upper]) 
    # loop which gets further input and displays 5 further rows of data     
    while response == 'y':
        print('Would you like to see 5 more rows of raw data?')
        print("\nPlease select Y for yes or any other key to continue")
        response = input().lower()
        if response == 'y':
             lower += 5
             upper += 5
             print(df.iloc[lower:upper])

def main():
    while True:
        city, month, day = get_filters()
        df = load_data(city, month, day)

        raw_data(df)
        time_stats(df)
        station_stats(df)
        trip_duration_stats(df)
        user_stats(df)

        restart = input('\nWould you like to restart? Enter yes or no.\n')
        if restart.lower() != 'yes':
            break


if __name__ == "__main__":
	main()
