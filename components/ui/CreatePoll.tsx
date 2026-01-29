import { PollsIcon } from "@/assets/svgs/Polls";
import { SendIcon } from "@/assets/svgs/Send";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, X } from "lucide-react-native";
import { useState } from "react";
import {
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
} from "react-native-reanimated";

const screen = Dimensions.get('screen');

interface CreatePollProps {
    onClose: () => void;
    onSendPoll: (question: string, options: string[]) => void;
    chatId: string;
}

export default function CreatePoll({ onClose, onSendPoll, chatId }: CreatePollProps) {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const addOption = () => {
        if (options.length < 10) {
            setOptions([...options, ""]);
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const canSendPoll = () => {
        if (!question.trim()) return false;
        const filledOptions = options.filter(opt => opt.trim() !== "");
        return filledOptions.length >= 2;
    };

    const handleSendPoll = () => {
        if (!canSendPoll()) return;
        
        const filledOptions = options.filter(opt => opt.trim() !== "");
        onSendPoll(question.trim(), filledOptions);
        onClose();
    };

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: -35,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 999,
                justifyContent: 'flex-end',
            }}
        >
            <Pressable
                style={{ flex: 1 }}
                onPress={onClose}
            />
            <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ?options.length>4?40:40:0}
                >
            <Animated.View
                entering={SlideInDown.duration(300)}
                exiting={SlideOutDown.duration(300)}
                style={{
                    backgroundColor: '#0f1419',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    maxHeight: screen.height * 0.85,
                    borderTopWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: '#2a2a2a',
                }}
            >
                
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 20,
                        paddingBottom: 15,
                        borderBottomWidth: 1,
                        borderBottomColor: '#2a2a2a',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                           
                            <PollsIcon size={24} color="#6bb5ed" />
                            <Text style={{
                                color: '#ffffff',
                                fontSize: 20,
                                fontWeight: '700',
                                fontFamily: 'Agdasima',
                            }}>
                                Create Poll
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                padding: 8,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: 8,
                            }}
                        >
                            <X size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ maxHeight: screen.height * 0.65 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={{ padding: 20, paddingTop: 20, gap: 20 }}>
                            {/* Question Input */}
                            <View>
                                <Text style={{
                                    color: '#bbbbbb',
                                    fontSize: 14,
                                    marginBottom: 8,
                                    fontWeight: '600',
                                    fontFamily: 'Agdasima',
                                }}>
                                    Question
                                </Text>
                                <TextInput
                                    placeholder="What's your question?"
                                    placeholderTextColor="#555"
                                    value={question}
                                    onChangeText={setQuestion}
                                    multiline
                                    maxLength={200}
                                    style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        borderWidth: 1,
                                        borderColor: question.trim() ? '#6bb5ed' : '#2a2a2a',
                                        borderRadius: 12,
                                        padding: 15,
                                        color: '#ffffff',
                                        fontSize: 16,
                                        fontWeight: '600',
                                        fontFamily: 'Agdasima',
                                        minHeight: 60,
                                        textAlignVertical: 'top',
                                    }}
                                />
                                <Text style={{
                                    color: '#666',
                                    fontSize: 12,
                                    marginTop: 4,
                                    textAlign: 'right',
                                    fontFamily: 'courier',
                                }}>
                                    {question.length}/200
                                </Text>
                            </View>

                            {/* Options */}
                            <View>
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 8,
                                }}>
                                    <Text style={{
                                        color: '#bbbbbb',
                                        fontSize: 14,
                                        fontWeight: '600',
                                        fontFamily: 'Agdasima',
                                    }}>
                                        Options (min. 2)
                                    </Text>
                                    <Text style={{
                                        color: '#666',
                                        fontSize: 12,
                                        fontFamily: 'courier',
                                    }}>
                                        {options.filter(opt => opt.trim() !== "").length}/10
                                    </Text>
                                </View>

                                <View style={{ gap: 10 }}>
                                    {options.map((option, index) => (
                                        <View
                                            key={index}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                            }}
                                        >
                                            <View style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 14,
                                                backgroundColor: 'rgba(107, 181, 237, 0.2)',
                                                borderWidth: 2,
                                                borderColor: option.trim() ? '#6bb5ed' : '#333',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}>
                                                <Text style={{
                                                    color: option.trim() ? '#6bb5ed' : '#666',
                                                    fontSize: 14,
                                                    fontWeight: '700',
                                                    fontFamily: 'Agdasima',
                                                }}>
                                                    {index + 1}
                                                </Text>
                                            </View>

                                            <TextInput
                                                placeholder={`Option ${index + 1}`}
                                                placeholderTextColor="#555"
                                                value={option}
                                                onChangeText={(value) => updateOption(index, value)}
                                                onFocus={() => setFocusedIndex(index)}
                                                onBlur={() => setFocusedIndex(null)}
                                                maxLength={100}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                    borderWidth: 1,
                                                    borderColor: focusedIndex === index
                                                        ? '#6bb5ed'
                                                        : option.trim()
                                                            ? '#2a2a2a'
                                                            : '#1a1a1a',
                                                    borderRadius: 10,
                                                    padding: 12,
                                                    paddingHorizontal: 15,
                                                    color: '#ffffff',
                                                    fontSize: 15,
                                                    fontWeight: '600',
                                                    fontFamily: 'Agdasima',
                                                }}
                                            />

                                            {options.length > 2 && (
                                                <TouchableOpacity
                                                    onPress={() => removeOption(index)}
                                                    style={{
                                                        padding: 8,
                                                        backgroundColor: 'rgba(255, 88, 88, 0.1)',
                                                        borderRadius: 8,
                                                    }}
                                                >
                                                    <X size={18} color="#ff5858" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>

                                {/* Add Option Button */}
                                {options.length < 10 && (
                                    <TouchableOpacity
                                        onPress={addOption}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            padding: 12,
                                            marginTop: 10,
                                            backgroundColor: 'rgba(107, 181, 237, 0.1)',
                                            borderWidth: 1,
                                            borderColor: '#6bb5ed33',
                                            borderRadius: 10,
                                            borderStyle: 'dashed',
                                        }}
                                    >
                                        <Plus size={20} color="#6bb5ed" />
                                        <Text style={{
                                            color: '#6bb5ed',
                                            fontSize: 15,
                                            fontWeight: '600',
                                            fontFamily: 'Agdasima',
                                        }}>
                                            Add Option
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Poll Info */}
                            <View style={{
                                backgroundColor: 'rgba(107, 181, 237, 0.05)',
                                borderLeftWidth: 3,
                                borderLeftColor: '#6bb5ed',
                                padding: 12,
                                borderRadius: 8,
                            }}>
                                <Text style={{
                                    color: '#999',
                                    fontSize: 13,
                                    fontFamily: 'Agdasima',
                                    lineHeight: 18,
                                }}>
                                    • Members can vote on one option{'\n'}
                                    • Results are visible after voting{'\n'}
                                    • Tap your vote again to change it
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Send Button */}
                    <View style={{
                        padding: 20,
                        paddingTop: 15,
                        borderTopWidth: 1,
                        borderTopColor: '#2a2a2a',
                    }}>
                        <TouchableOpacity
                            onPress={handleSendPoll}
                            disabled={!canSendPoll()}
                            style={{
                                opacity: canSendPoll() ? 1 : 0.5,
                            }}
                        >
                            <LinearGradient
                                colors={canSendPoll()
                                    ? ['rgba(107, 181, 237, 0.9)', 'rgba(43, 183, 238, 0.7)']
                                    : ['rgba(107, 181, 237, 0.3)', 'rgba(43, 183, 238, 0.3)']
                                }
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    padding: 16,
                                    borderRadius: 12,
                                }}
                            >
                                <SendIcon color='white' size={22} />
                                
                                <Text style={{
                                    color: '#ffffff',
                                    fontSize: 17,
                                    fontWeight: '700',
                                    fontFamily: 'Agdasima',
                                }}>
                                    Send Poll
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
            </Animated.View>
        </KeyboardAvoidingView>

        </Animated.View>
    );
}